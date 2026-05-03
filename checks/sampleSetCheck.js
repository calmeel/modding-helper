function runSampleSetCheck(text, fileName) {
  const timingIssues = findTimingPointSampleSetIssues(text);
  const objectIssues = findHitObjectSampleSetIssues(text);

  return {
    fileName,
    timingIssues,
    objectIssues
  };
}

function findTimingPointSampleSetIssues(text) {
  const lines = text.split(/\r?\n/);
  const issues = [];

  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 8) continue;

      const time = Math.round(parseFloat(parts[0]));
      const sampleSet = parseInt(parts[3], 10);
      const uninherited = parseInt(parts[6], 10);

      if (Number.isNaN(time) || Number.isNaN(sampleSet) || Number.isNaN(uninherited)) {
        continue;
      }

      if (sampleSet !== 1) {
        issues.push({
          time,
          lineType: uninherited === 1 ? "BPM line" : "SV line",
          sampleSet,
          sampleSetName: getSampleSetName(sampleSet),
          lineNo: i + 1
        });
      }
    }
  }

  return issues;
}

function findHitObjectSampleSetIssues(text) {
  const lines = text.split(/\r?\n/);
  const issues = [];

  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[HitObjects]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed) continue;

      const parts = trimmed.split(",");
      if (parts.length < 5) continue;

      const time = parseInt(parts[2], 10);
      const type = parseInt(parts[3], 10);

      if (Number.isNaN(time) || Number.isNaN(type)) continue;

      const hitSample = getHitSamplePart(parts, type);
      if (!hitSample) continue;

      const sampleParts = hitSample.split(":");
      const normalSet = parseInt(sampleParts[0] || "0", 10);
      const additionSet = parseInt(sampleParts[1] || "0", 10);

      if (normalSet !== 0) {
        issues.push({
          time,
          objectType: getObjectTypeName(type),
          field: "normalSet",
          sampleSet: normalSet,
          sampleSetName: getSampleSetName(normalSet),
          lineNo: i + 1
        });
      }

      if (additionSet !== 0) {
        issues.push({
          time,
          objectType: getObjectTypeName(type),
          field: "additionSet",
          sampleSet: additionSet,
          sampleSetName: getSampleSetName(additionSet),
          lineNo: i + 1
        });
      }
    }
  }

  return issues;
}

function getHitSamplePart(parts, type) {
  if (isSpinnerType(type)) {
    return parts[6] || "";
  }

  if (isSliderType(type)) {
    return parts[10] || "";
  }

  return parts[5] || "";
}

function isSliderType(type) {
  return (type & 2) !== 0;
}

function isSpinnerType(type) {
  return (type & 8) !== 0;
}

function getObjectTypeName(type) {
  if ((type & 8) !== 0) return "Spinner";
  if ((type & 2) !== 0) return "Slider";
  if ((type & 1) !== 0) return "Circle";
  return "Object";
}

function getSampleSetName(value) {
  switch (value) {
    case 0: return "Default";
    case 1: return "Normal";
    case 2: return "Soft";
    case 3: return "Drum";
    default: return `Unknown(${value})`;
  }
}