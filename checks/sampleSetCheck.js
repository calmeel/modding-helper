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
      const sampleIndex = parseInt(parts[4], 10);
      const uninherited = parseInt(parts[6], 10);

      if (
        Number.isNaN(time) ||
        Number.isNaN(sampleSet) ||
        Number.isNaN(sampleIndex) ||
        Number.isNaN(uninherited)
      ) {
        continue;
      }

      if (sampleSet !== 1) {
        issues.push({
          time,
          lineType: uninherited === 1 ? "BPM line" : "SV line",
          field: "sampleSet",
          sampleSet,
          sampleSetName: getSampleSetName(sampleSet),
          lineNo: i + 1
        });
      }

      if (sampleIndex !== 0) {
        issues.push({
          time,
          lineType: uninherited === 1 ? "BPM line" : "SV line",
          field: "sampleIndex",
          sampleIndex,
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

      checkSliderEdgeIssues(parts, time, type, i + 1, issues);

      const hitSample = getHitSamplePart(parts, type);

      const sampleParts = hitSample.split(":");
      const normalSet = parseInt(sampleParts[0] || "0", 10);
      const additionSet = parseInt(sampleParts[1] || "0", 10);

      const sampleIndex = parseInt(sampleParts[2] || "0", 10);
      const customFileName = (sampleParts[4] || "").trim();

      if (sampleIndex !== 0) {
        issues.push({
          time,
          objectType: getObjectTypeName(type),
          field: "sampleIndex",
          sampleIndex,
          lineNo: i + 1
        });
      }

      if (customFileName !== "") {
        issues.push({
          time,
          objectType: getObjectTypeName(type),
          field: "customFileName",
          customFileName,
          lineNo: i + 1
        });
      }

      // 0 = auto, 1 = normal → OK
      // 2,3 などだけ検出
      if (normalSet > 1) {
        issues.push({
          time,
          objectType: getObjectTypeName(type),
          field: "normalSet",
          sampleSet: normalSet,
          sampleSetName: getSampleSetName(normalSet),
          lineNo: i + 1
        });
      }

      if (additionSet > 1) {
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

function checkSliderEdgeIssues(parts, time, type, lineNo, issues) {
  if (!isSliderType(type)) return;

  const edgeSounds = parts[8] || "";
  const edgeSets = parts[9] || "";

  if (edgeSounds) {
    const sounds = edgeSounds.split("|");

    sounds.forEach((raw, index) => {
      const sound = parseInt(raw || "0", 10);
      if (Number.isNaN(sound)) return;

      // 0 = normal only → OK
      // 2 whistle, 4 finish, 8 clap などを検出
      if (sound !== 0) {
        issues.push({
          time,
          objectType: "Slider",
          field: "edgeSounds",
          edgeIndex: index,
          edgeSound: sound,
          lineNo
        });
      }
    });
  }

  if (edgeSets) {
    const sets = edgeSets.split("|");

    sets.forEach((raw, index) => {
      const setParts = raw.split(":");
      const normalSet = parseInt(setParts[0] || "0", 10);
      const additionSet = parseInt(setParts[1] || "0", 10);

      // 0 = auto, 1 = normal → OK
      // 2 = soft, 3 = drum を検出
      if (normalSet > 1) {
        issues.push({
          time,
          objectType: "Slider",
          field: "edgeSets.normalSet",
          edgeIndex: index,
          sampleSet: normalSet,
          sampleSetName: getSampleSetName(normalSet),
          lineNo
        });
      }

      if (additionSet > 1) {
        issues.push({
          time,
          objectType: "Slider",
          field: "edgeSets.additionSet",
          edgeIndex: index,
          sampleSet: additionSet,
          sampleSetName: getSampleSetName(additionSet),
          lineNo
        });
      }
    });
  }
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