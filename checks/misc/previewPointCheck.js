const PREVIEW_POINT_SNAP_CANDIDATES = [1, 2, 3, 4, 6, 8, 12, 16];
const PREVIEW_POINT_SNAP_TOLERANCE_MS = 1;

function runPreviewPointCheck(text, fileName, options = {}) {
  const audioBitrate = analyzePreviewPointAudioBitrate(options);
  const previewTime = parsePreviewTime(text);

  if (previewTime === null) {
    return {
      fileName,
      level: "warn",
      previewTime: null,
      snap: null,
      diff: null,
      audioBitrate
    };
  }

  const redTimingPoints = parseTimingPoints(text);
  const currentRed = findCurrentRedTimingPoint(redTimingPoints, previewTime);

  if (!currentRed) {
    return {
      fileName,
      level: "warn",
      previewTime,
      snap: "unknown",
      diff: null,
      audioBitrate
    };
  }

  const snap = detectSnapAtTime(
    previewTime,
    currentRed.time,
    currentRed.beatLength,
    PREVIEW_POINT_SNAP_CANDIDATES,
    PREVIEW_POINT_SNAP_TOLERANCE_MS
  );

  if (!snap) {
    return {
      fileName,
      level: "warn",
      previewTime,
      snap: "unknown",
      diff: null,
      audioBitrate
    };
  }

  return {
    fileName,
    level: snap.diff === 0 ? "ok" : "warn",
    previewTime,
    snap: `1/${snap.snap}`,
    diff: snap.diff,
    audioBitrate
  };
}

function parsePreviewTime(text) {
  const lines = text.split(/\r?\n/);
  let inGeneral = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[General]") {
      inGeneral = true;
      continue;
    }

    if (inGeneral) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("PreviewTime:")) {
        const value = parseInt(trimmed.slice(trimmed.indexOf(":") + 1), 10);
        return Number.isFinite(value) ? value : null;
      }
    }
  }

  return null;
}


function analyzePreviewPointAudioBitrate(options = {}) {
  const audioFileName = options.audioFileName ?? "";
  const audioEntryName = options.audioEntryName ?? "";
  const audioBytes = options.audioBytes ?? null;
  const displayName = audioEntryName || audioFileName;

  if (!displayName || !/\.mp3$/i.test(displayName) || !audioBytes?.length) {
    return {
      audioFileName,
      audioEntryName,
      isMp3: /\.mp3$/i.test(displayName),
      isVbr: false,
      checked: false
    };
  }

  const isVbr = detectPreviewPointMp3Vbr(audioBytes);

  return {
    audioFileName,
    audioEntryName,
    isMp3: true,
    isVbr,
    checked: true
  };
}

function detectPreviewPointMp3Vbr(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const firstFrame = findPreviewPointMp3Frame(view, skipPreviewPointId3v2(view));

  if (!firstFrame) return false;

  if (hasPreviewPointMp3HeaderTag(view, firstFrame.offset, firstFrame.xingOffset, "Xing")) {
    return true;
  }

  if (hasPreviewPointMp3HeaderTag(view, firstFrame.offset, firstFrame.xingOffset, "Info")) {
    return false;
  }

  if (hasPreviewPointMp3HeaderTag(view, firstFrame.offset, 36, "VBRI")) {
    return true;
  }

  const bitrates = new Set();
  let offset = firstFrame.offset;

  for (let i = 0; i < 80 && offset < view.length - 4; i++) {
    const frame = findPreviewPointMp3Frame(view, offset);
    if (!frame) break;

    bitrates.add(frame.bitrateKbps);
    if (bitrates.size > 1) return true;

    offset = frame.offset + Math.max(frame.frameLength, 1);
  }

  return false;
}

function skipPreviewPointId3v2(bytes) {
  if (
    bytes.length >= 10 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33
  ) {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    const hasFooter = (bytes[5] & 0x10) !== 0;
    return 10 + size + (hasFooter ? 10 : 0);
  }

  return 0;
}

function findPreviewPointMp3Frame(bytes, startOffset) {
  for (let offset = Math.max(0, startOffset); offset < bytes.length - 4; offset++) {
    const frame = parsePreviewPointMp3Frame(bytes, offset);
    if (frame) return frame;
  }

  return null;
}

function parsePreviewPointMp3Frame(bytes, offset) {
  if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) {
    return null;
  }

  const versionBits = (bytes[offset + 1] >> 3) & 0x03;
  const layerBits = (bytes[offset + 1] >> 1) & 0x03;
  const bitrateIndex = (bytes[offset + 2] >> 4) & 0x0f;
  const sampleRateIndex = (bytes[offset + 2] >> 2) & 0x03;
  const padding = (bytes[offset + 2] >> 1) & 0x01;
  const channelMode = (bytes[offset + 3] >> 6) & 0x03;

  if (
    versionBits === 1 ||
    layerBits !== 1 ||
    bitrateIndex === 0 ||
    bitrateIndex === 15 ||
    sampleRateIndex === 3
  ) {
    return null;
  }

  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
  const bitratesMpeg1Layer3 = [null, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const bitratesMpeg2Layer3 = [null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const bitrateKbps = (version === 1 ? bitratesMpeg1Layer3 : bitratesMpeg2Layer3)[bitrateIndex];
  const sampleRates = {
    1: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    2.5: [11025, 12000, 8000]
  };
  const sampleRate = sampleRates[version][sampleRateIndex];

  if (!bitrateKbps || !sampleRate) return null;

  const coefficient = version === 1 ? 144000 : 72000;
  const frameLength = Math.floor((coefficient * bitrateKbps) / sampleRate) + padding;
  const isMono = channelMode === 3;
  const xingOffset = version === 1
    ? (isMono ? 21 : 36)
    : (isMono ? 13 : 21);

  if (frameLength <= 4) return null;

  return {
    offset,
    bitrateKbps,
    frameLength,
    xingOffset
  };
}

function hasPreviewPointMp3HeaderTag(bytes, frameOffset, relativeOffset, tag) {
  const offset = frameOffset + relativeOffset;
  if (offset < 0 || offset + tag.length > bytes.length) return false;

  for (let i = 0; i < tag.length; i++) {
    if (bytes[offset + i] !== tag.charCodeAt(i)) {
      return false;
    }
  }

  return true;
}
