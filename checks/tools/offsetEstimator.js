const OFFSET_ESTIMATOR_OSU_PEAK_OFFSET_MS = 28.7;

function estimateOffsetFromAudioBuffer(audioBuffer, text) {
  const redLines = parseOffsetWaveformRedLines(text);
  const firstRed = redLines[0];

  if (!audioBuffer || !firstRed) {
    return {
      ok: false,
      reason: "offsetEstimateNoTiming"
    };
  }

  if (!Number.isFinite(firstRed.beatLength) || firstRed.beatLength <= 0) {
    return {
      ok: false,
      reason: "offsetEstimateNoTiming"
    };
  }

  const bpm = 60000 / firstRed.beatLength;
  const mono = offsetEstimatorAudioBufferToMono(audioBuffer);
  const envelope = offsetEstimatorCreateEnvelope(mono, audioBuffer.sampleRate);
  const processed = offsetEstimatorPreprocessEnvelope(envelope);
  const offsetResult = offsetEstimatorDetectOffset(processed, bpm);

  if (!offsetResult || !Number.isFinite(offsetResult.osuOffset)) {
    return {
      ok: false,
      reason: "offsetEstimateFailed"
    };
  }

  const beatLength = firstRed.beatLength;
  const currentPhase = offsetEstimatorPositiveModulo(firstRed.time, beatLength);
  const estimatedPhase = offsetEstimatorPositiveModulo(offsetResult.osuOffset, beatLength);
  const delta = offsetEstimatorNormalizeDelta(estimatedPhase - currentPhase, beatLength);
  const estimatedOffset = firstRed.time + delta;
  const confidence = offsetEstimatorGetConfidence(offsetResult.debug.topFoldedPeaks);

  return {
    ok: true,
    bpm,
    beatLength,
    currentOffset: firstRed.time,
    estimatedOffset,
    delta,
    confidence,
    topCandidates: offsetResult.debug.topFoldedPeaks
      .slice(0, 5)
      .map(candidate => ({
        phase: offsetEstimatorPositiveModulo(candidate.osuOffset, beatLength),
        value: candidate.value
      }))
  };
}

function offsetEstimatorAudioBufferToMono(audioBuffer) {
  const length = audioBuffer.length;
  const channels = audioBuffer.numberOfChannels;
  const mono = new Float32Array(length);

  for (let ch = 0; ch < channels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channels;
    }
  }

  return mono;
}

function offsetEstimatorCreateEnvelope(mono, sampleRate) {
  const samplesPerMs = sampleRate / 1000;
  const msLength = Math.floor(mono.length / samplesPerMs);
  const envelope = new Float32Array(msLength);

  for (let ms = 0; ms < msLength; ms++) {
    const start = Math.floor(ms * samplesPerMs);
    const end = Math.floor((ms + 1) * samplesPerMs);
    let sum = 0;
    let count = 0;

    for (let i = start; i < end && i < mono.length; i++) {
      sum += Math.abs(mono[i]);
      count++;
    }

    envelope[ms] = sum / Math.max(1, count);
  }

  return envelope;
}

function offsetEstimatorPreprocessEnvelope(envelope) {
  const length = envelope.length;
  let maxValue = 0;

  for (let i = 0; i < length; i++) {
    if (envelope[i] > maxValue) maxValue = envelope[i];
  }

  const normalized = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    normalized[i] = maxValue > 0 ? envelope[i] / maxValue : 0;
  }

  const offsets = [0, 2, 6, 10, 14, 16];
  const product = new Float32Array(length);
  product.fill(1);

  for (let pass = 0; pass < 2; pass++) {
    const squared = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      const v = normalized[i];
      squared[i] = v * v;
    }

    for (let i = 0; i < length; i++) {
      let localEnergy = 0;

      for (const offset of offsets) {
        const left = i - offset;
        const right = i + offset;

        if (left >= 0) localEnergy += squared[left];
        if (right < length && offset !== 0) localEnergy += squared[right];
      }

      localEnergy /= offsets.length * 2 - 1;
      product[i] *= 1 + localEnergy * 0.25;
    }
  }

  const logged = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    logged[i] = Math.log(product[i]);
  }

  const diff = new Float32Array(length);
  for (let i = 1; i < length; i++) {
    const delta = logged[i] - logged[i - 1];
    diff[i] = Math.max(0, delta);
  }

  const smoothed = new Float32Array(length);
  for (let i = 1; i < length - 1; i++) {
    smoothed[i] = diff[i - 1] * 0.25 + diff[i] * 0.5 + diff[i + 1] * 0.25;
  }

  return smoothed;
}

function offsetEstimatorDetectOffset(envelope, bpm) {
  const beatLength = 60000 / bpm;
  const period = Math.floor(beatLength);
  const foldedLength = period + 40;
  const folded = new Float32Array(foldedLength);
  const beatCount = Math.floor(envelope.length / beatLength);

  for (let beat = 0; beat < beatCount; beat++) {
    const base = Math.round(beat * beatLength);

    for (let i = 0; i < foldedLength; i++) {
      const index = base + i;
      if (index >= envelope.length) break;
      folded[i] += envelope[index];
    }
  }

  let peak = 35;
  const searchEnd = Math.min(foldedLength - 2, period + 35);

  for (let i = 35; i <= searchEnd; i++) {
    if (folded[i] > folded[peak]) peak = i;
  }

  const refinedPeak = offsetEstimatorRefinePeakTimeFromArray(folded, peak);
  const osuOffset = refinedPeak - OFFSET_ESTIMATOR_OSU_PEAK_OFFSET_MS;
  const topFoldedPeaks = offsetEstimatorGetTopFoldedPeaks(folded, 20, searchEnd)
    .map(item => {
      const refined = offsetEstimatorRefinePeakTimeFromArray(folded, item.index);
      return {
        index: item.index,
        value: item.value,
        refined,
        osuOffset: refined - OFFSET_ESTIMATOR_OSU_PEAK_OFFSET_MS
      };
    });

  return {
    osuOffset,
    debug: {
      beatLength,
      period,
      beatCount,
      peak,
      searchEnd,
      refinedPeak,
      topFoldedPeaks
    }
  };
}

function offsetEstimatorRefinePeakTimeFromArray(array, i) {
  const left = array[i - 1];
  const center = array[i];
  const right = array[i + 1];
  const denominator = (center - right) + (center - left);

  if (denominator === 0) return i;
  return i + ((right - left) * 0.5) / denominator;
}

function offsetEstimatorGetTopFoldedPeaks(folded, count, searchEnd = folded.length - 2) {
  const peaks = [];

  for (let i = 35; i <= searchEnd; i++) {
    if (
      folded[i] > 0 &&
      folded[i] >= folded[i - 1] &&
      folded[i] >= folded[i + 1]
    ) {
      peaks.push({
        index: i,
        value: folded[i]
      });
    }
  }

  return peaks
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

function offsetEstimatorGetConfidence(topFoldedPeaks) {
  if (!topFoldedPeaks || topFoldedPeaks.length === 0) return 0;

  const first = topFoldedPeaks[0].value || 0;
  const second = topFoldedPeaks[1]?.value || 0;

  if (first <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - second / first));
}

function offsetEstimatorPositiveModulo(value, period) {
  return ((value % period) + period) % period;
}

function offsetEstimatorNormalizeDelta(delta, period) {
  let normalized = offsetEstimatorPositiveModulo(delta + period / 2, period) - period / 2;

  if (normalized <= -period / 2) normalized += period;
  return normalized;
}
