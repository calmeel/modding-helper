const HITSND_WHISTLE = 2;
const HITSND_CLAP = 8;

const showClap = document.getElementById("showClap");
const showWhistle = document.getElementById("showWhistle");

function isTargetCircle(objType) {
  return objType === 1 || objType === 5;
}

function classifyHitSound(hitSound) {
  const hasWhistle = (hitSound & HITSND_WHISTLE) !== 0;
  const hasClap = (hitSound & HITSND_CLAP) !== 0;

  if (hasWhistle && hasClap) return "both";
  if (hasWhistle) return "whistle";
  if (hasClap) return "clap";
  return "none";
}

function runClapWhistleCheck(text, fileName) {
  const hitObjects = parseHitObjects(text);

  const counts = {
    whistle: 0,
    clap: 0,
    both: 0,
    none: 0,
    targets: 0
  };

  const times = {
    whistle: [],
    clap: [],
    both: [],
    none: []
  };

  for (const line of hitObjects) {
    const parts = line.split(",");

    if (parts.length < 5) continue;

    const time = parseInt(parts[2], 10);
    const objType = parseInt(parts[3], 10);
    const hitSound = parseInt(parts[4], 10) || 0;

    if (Number.isNaN(time) || Number.isNaN(objType)) continue;

    if (!isTargetCircle(objType)) continue;

    counts.targets++;

    const category = classifyHitSound(hitSound);

    counts[category]++;
    times[category].push(time);
  }

  return {
    fileName,
    counts,
    times
  };
}