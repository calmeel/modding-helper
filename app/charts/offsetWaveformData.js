function createOffsetWaveformData(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const samplesPerMs = sampleRate / 1000;
  const pointCount = Math.floor(audioBuffer.length / samplesPerMs);
  const points = new Array(pointCount);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1
    ? audioBuffer.getChannelData(1)
    : left;

  const lowAlpha = getOffsetWaveformLowPassAlpha(100, sampleRate);
  const midHighAlpha = getOffsetWaveformLowPassAlpha(2000, sampleRate);
  let lowPass = 0;
  let midHighPass = 0;

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
    const start = Math.floor(pointIndex * samplesPerMs);
    const end = Math.min(
      audioBuffer.length,
      Math.max(start + 1, Math.floor((pointIndex + 1) * samplesPerMs))
    );

    const point = {
      amplitudeLeft: 0,
      amplitudeRight: 0,
      lowIntensity: 0,
      midIntensity: 0,
      highIntensity: 0
    };

    for (let i = start; i < end; i++) {
      const leftSample = left[i] || 0;
      const rightSample = right[i] || 0;
      const mono = (leftSample + rightSample) * 0.5;

      point.amplitudeLeft = Math.max(point.amplitudeLeft, Math.abs(leftSample));
      point.amplitudeRight = Math.max(point.amplitudeRight, Math.abs(rightSample));

      lowPass += lowAlpha * (mono - lowPass);
      midHighPass += midHighAlpha * (mono - midHighPass);

      const low = Math.abs(lowPass);
      const mid = Math.abs(midHighPass - lowPass);
      const high = Math.abs(mono - midHighPass);

      point.lowIntensity = Math.max(point.lowIntensity, low);
      point.midIntensity = Math.max(point.midIntensity, mid);
      point.highIntensity = Math.max(point.highIntensity, high);
    }

    point.amplitudeLeft = Math.min(1, point.amplitudeLeft);
    point.amplitudeRight = Math.min(1, point.amplitudeRight);
    points[pointIndex] = point;
  }

  return {
    points,
    durationMs: pointCount
  };
}

function resampleOffsetWaveformData(waveformData, startMs, endMs, pointCount) {
  if (!waveformData?.points?.length || pointCount <= 0) {
    return {
      points: [],
      maxLowIntensity: 0,
      maxMidIntensity: 0,
      maxHighIntensity: 0
    };
  }

  const source = waveformData.points;
  const start = Math.max(0, Math.floor(startMs));
  const end = Math.min(source.length, Math.max(start + 1, Math.ceil(endMs)));
  const sourceLength = end - start;
  const pointsPerGeneratedPoint = sourceLength / pointCount;
  const kernelWidth = Math.max(1, Math.floor(pointsPerGeneratedPoint * 3) + 1);
  const filter = new Float32Array(kernelWidth + 1);

  for (let i = 0; i < filter.length; i++) {
    filter[i] = evalOffsetWaveformGaussian(i, pointsPerGeneratedPoint);
  }

  const generated = new Array(pointCount);
  let maxLowIntensity = 0;
  let maxMidIntensity = 0;
  let maxHighIntensity = 0;

  for (let generatedIndex = 0; generatedIndex < pointCount; generatedIndex++) {
    const sourceIndex = start + generatedIndex * pointsPerGeneratedPoint;
    const center = Math.floor(sourceIndex);
    const point = {
      amplitudeLeft: 0,
      amplitudeRight: 0,
      lowIntensity: 0,
      midIntensity: 0,
      highIntensity: 0
    };
    let totalWeight = 0;

    for (let i = center - kernelWidth; i < center + kernelWidth; i++) {
      if (i < start || i >= end) continue;

      const sourcePoint = source[i];
      const weight = filter[Math.min(filter.length - 1, Math.abs(i - center))];
      totalWeight += weight;

      point.amplitudeLeft += sourcePoint.amplitudeLeft * weight;
      point.amplitudeRight += sourcePoint.amplitudeRight * weight;
      point.lowIntensity += sourcePoint.lowIntensity * weight;
      point.midIntensity += sourcePoint.midIntensity * weight;
      point.highIntensity += sourcePoint.highIntensity * weight;
    }

    if (totalWeight > 0) {
      point.amplitudeLeft /= totalWeight;
      point.amplitudeRight /= totalWeight;
      point.lowIntensity /= totalWeight;
      point.midIntensity /= totalWeight;
      point.highIntensity /= totalWeight;
    }

    maxLowIntensity = Math.max(maxLowIntensity, point.lowIntensity);
    maxMidIntensity = Math.max(maxMidIntensity, point.midIntensity);
    maxHighIntensity = Math.max(maxHighIntensity, point.highIntensity);
    generated[generatedIndex] = point;
  }

  return {
    points: generated,
    maxLowIntensity,
    maxMidIntensity,
    maxHighIntensity
  };
}

function getOffsetWaveformLowPassAlpha(cutoffFrequency, sampleRate) {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffFrequency);
  return dt / (rc + dt);
}

function evalOffsetWaveformGaussian(x, standardDeviation) {
  const sigma = Math.max(0.001, standardDeviation);
  return Math.exp(-0.5 * (x / sigma) ** 2);
}
