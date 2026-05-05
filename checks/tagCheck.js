const TAG_SPELLING_DICTIONARY = [
  // MPG / mapping
  "featured", "artist", "mappers'", "guild", "tiebreaker",

  // genres / style
  "artcore", "anime", "ambient", "extratone", "hardcore", "hardtek",
  "melodic", "techno", "hardstyle", "psystyle", "psytrance", "trance",
  "electropop", "future", "bass", "female", "vocals", "vocalist",
  "vocaloid", "jazz", "electronic", "instrumental", "hitech", "hi-tech",
  "gothic", "speedcore", "splittercore", "otogecore", "frenchcore",
  "200step", "dubstep", "drumstep", "chiptune", "breakcore", "piano",
  "mechakuchacore", "hypertrance", "terrorcore", "jungle", "metal",
  "gabber", "gabba", "guitar", "glitch", "hop", "celtic", "music",
  "schranz", "trap", "nightcore", "house", "ballade", "ballad",
  "hip-hop", "funk", "folk", "funkot", "mákina", "eurodance",
  "eurobeat", "jodeln", "reggae", "waltz", "ethnic", "bootleg",
  "remix", "lolicore", "utattemita"
];

const TAG_RELATED_RULES = [
  {
    trigger: ["featured", "artist"],
    suggestGroup: ["featured", "artist", "fa"]
  },
  {
    trigger: ["mappers'", "guild"],
    suggestGroup: ["mappers'", "guild", "mg", "mpg"]
  },

  {
    trigger: ["j-core", "jcore"],
    suggestGroup: ["j-core", "jcore"]
  },
  {
    trigger: ["jpop", "j-pop"],
    suggestGroup: ["jpop", "j-pop", "pop"]
  },
  {
    trigger: ["kpop", "k-pop"],
    suggestGroup: ["kpop", "k-pop", "pop"]
  },
  {
    trigger: ["j-rock", "jrock"],
    suggestGroup: ["rock", "j-rock", "jrock"]
  },
  {
    trigger: ["hiphop", "hip-hop"],
    suggestGroup: ["hiphop", "hip", "hop", "hip-hop"]
  },
  {
    trigger: ["hitech", "hi-tech"],
    suggestGroup: ["hitech", "hi-tech"]
  },
  {
    trigger: ["gabber", "gabba"],
    suggestGroup: ["gabber", "gabba"]
  },
  {
    trigger: ["ballade", "ballad"],
    suggestGroup: ["ballade", "ballad"]
  },
  {
    trigger: ["female"],
    suggestGroup: ["female", "vocals", "vocalist"]
  },
  {
    trigger: ["male"],
    suggestGroup: ["male", "vocals", "vocalist"]
  },
  {
    trigger: ["psytrance", "psychedelic"],
    suggestGroup: ["psychedelic", "trance", "psytrance"]
  },
  {
    trigger: ["ボカロ", "ボーカロイド", "vocaloid"],
    suggestGroup: ["ボカロ", "ボーカロイド", "vocaloid"]
  },
  {
    trigger: ["synthesizer", "synthv"],
    suggestGroup: ["synthesizer", "synthv", "v", "sv"]
  },
  {
    trigger: ["東方project", "東方"],
    suggestGroup: ["東方project", "東方", "project"]
  },
  {
    trigger: ["edm"],
    suggestGroup: ["electronic", "dance", "music", "edm"]
  },
  {
    trigger: ["drum'n'bass", "dnb", "d&b", "d'n'b"],
    suggestGroup: ["drum", "and", "bass", "drum'n'bass", "dnb", "d&b", "d'n'b"]
  },
  {
    trigger: ["vtuber"],
    suggestGroup: ["virtual", "youtuber", "vtuber"]
  },
  {
    trigger: ["vn"],
    suggestGroup: ["visual", "novel", "vn"]
  },
  {
    trigger: ["ost"],
    suggestGroup: ["original", "soundtrack", "ost"]
  },
  {
    trigger: ["vgm"],
    suggestGroup: ["video", "game", "vgm"]
  },
  {
    trigger: ["歌ってみた", "utattemita"],
    suggestGroup: ["歌ってみた", "utattemita"]
  },
  {
    trigger: ["音mad", "音ｍａｄ", "音窓", "otomad", "oto-mad"],
    suggestGroup: ["音mad", "音ｍａｄ", "音窓", "oto", "mad", "otomad", "oto-mad"]
  },
  {
    trigger: ["ニコニコ動画", "niconico", "nnd"],
    suggestGroup: ["ニコニコ動画", "niconico", "nico", "douga", "nnd"]
  },
  {
    trigger: ["プロセカ", "proseka", "puroseka", "prsk", "pjsk"],
    suggestGroup: ["プロセカ", "proseka", "puroseka", "project", "sekai", "colorful", "stage!", "prsk", "pjsk"]
  },
  {
    trigger: ["opening", "op"],
    suggestGroup: ["opening", "op"]
  },
  {
    trigger: ["ending", "ed"],
    suggestGroup: ["ending", "ed"]
  },

  {
    trigger: ["ro16"],
    suggestGroup: ["round", "of", "16", "ro16"]
  },
  {
    trigger: ["quarterfinals", "qf"],
    suggestGroup: ["quarterfinals", "qf"]
  },
  {
    trigger: ["semifinals", "sf"],
    suggestGroup: ["semifinals", "sf"]
  },
  {
    trigger: ["grandfinals", "grand", "gf"],
    suggestGroup: ["grandfinals", "grand", "finals", "gf"]
  },
  {
    trigger: ["tiebreaker", "tb"],
    suggestGroup: ["tiebreaker", "tb"]
  }
];

function runTagCheck(text, fileName) {
  const tagsLine = findMetadataTagsLine(text);
  const results = [];
  const spellingSuggestions = [];
  const relatedSuggestions = [];

  if (!tagsLine) {
    return {
      fileName,
      tags: "",
      normalizedTags: "",
      results: [
        {
          type: "missing",
          message: "Tags line not found"
        }
      ],
      spellingSuggestions,
      relatedSuggestions
    };
  }

  const tags = tagsLine.value;
  const normalizedTags = normalizeTagsForCompare(tags);

  const multiSpaceMatches = [...tags.matchAll(/ {2,}/g)];
  for (const match of multiSpaceMatches) {
    const index = match.index;
    const context = getTagIssueContextAroundSpace(tags, index);

    results.push({
      type: "multipleSpaces",
      label: "2つ以上の半角スペース",
      context
    });
  }

  const fullWidthSpaceMatches = [...tags.matchAll(/　/g)];
  for (const match of fullWidthSpaceMatches) {
    const index = match.index;
    const context = getTagIssueContextAroundSpace(tags, index);

    results.push({
      type: "fullWidthSpace",
      label: "全角スペース",
      context
    });
  }

  spellingSuggestions.push(...findTagSpellingSuggestions(tags));
  relatedSuggestions.push(...findTagRelatedSuggestions(tags));

  return {
    fileName,
    tags,
    normalizedTags,
    results,
    spellingSuggestions,
    relatedSuggestions
  };
}

function findMetadataTagsLine(text) {
  const lines = text.split(/\r?\n/);

  let inMetadata = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[Metadata]") {
      inMetadata = true;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("Tags:")) {
        return {
          lineNo: i + 1,
          value: lines[i].slice(lines[i].indexOf(":") + 1)
        };
      }
    }
  }

  return null;
}

function normalizeTagsForCompare(tags) {
  return String(tags)
    .trim()
    .replace(/　/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeTagToken(tag) {
  return String(tag).trim().toLowerCase();
}

function getTagWords(tags) {
  const normalized = normalizeTagsForCompare(tags);

  if (!normalized) return [];

  return normalized.split(" ");
}

function getNormalizedTagWords(tags) {
  return getTagWords(tags).map(normalizeTagToken).filter(Boolean);
}

function compareTagsAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      base: results?.[0] ?? null,
      mismatches: []
    };
  }

  const validResults = results.filter(result => result.normalizedTags !== undefined);

  if (validResults.length < 2) {
    return {
      hasMismatch: false,
      base: validResults[0] ?? null,
      mismatches: []
    };
  }

  const base = validResults[0];
  const baseWords = getTagWords(base.tags);
  const baseSet = new Set(baseWords.map(normalizeTagToken));

  const mismatches = [];

  for (const result of validResults.slice(1)) {
    if (result.normalizedTags === base.normalizedTags) continue;

    const words = getTagWords(result.tags);
    const set = new Set(words.map(normalizeTagToken));

    const removed = baseWords.filter(tag => !set.has(normalizeTagToken(tag)));
    const added = words.filter(tag => !baseSet.has(normalizeTagToken(tag)));

    mismatches.push({
      fileName: result.fileName,
      baseFileName: base.fileName,
      removed,
      added,
      tags: result.tags,
      baseTags: base.tags
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}

function findTagSpellingSuggestions(tags) {
  const words = getNormalizedTagWords(tags);
  const wordSet = new Set(words);
  const suggestions = [];

  for (const word of words) {
    if (word.length < 4) continue;
    if (TAG_SPELLING_DICTIONARY.includes(word)) continue;

    let best = null;

    for (const candidate of TAG_SPELLING_DICTIONARY) {
      const normalizedCandidate = normalizeTagToken(candidate);

      if (wordSet.has(normalizedCandidate)) continue;
      if (Math.abs(word.length - normalizedCandidate.length) > 1) continue;

      const distance = levenshteinDistance(word, normalizedCandidate);

      if (distance === 1) {
        best = normalizedCandidate;
        break;
      }
    }

    if (best) {
      suggestions.push({
        tag: word,
        suggestion: best
      });
    }
  }

  return dedupeTagSpellingSuggestions(suggestions);
}

function findTagRelatedSuggestions(tags) {
  const words = getNormalizedTagWords(tags);
  const wordSet = new Set(words);
  const suggestions = [];

  for (const rule of TAG_RELATED_RULES) {
    const trigger = rule.trigger.map(normalizeTagToken);
    const suggestGroup = rule.suggestGroup.map(normalizeTagToken);

    const presentTriggers = trigger.filter(tag => wordSet.has(tag));

    // triggerに含まれるtagが1つも無い場合は発火しない
    if (!presentTriggers.length) continue;

    const missing = suggestGroup.filter(tag => !wordSet.has(tag));

    if (!missing.length) continue;

    suggestions.push({
      present: presentTriggers,
      suggestions: missing
    });
  }

  return dedupeTagRelatedSuggestions(suggestions);
}

function dedupeTagSpellingSuggestions(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = `${item.tag}->${item.suggestion}`;
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function dedupeTagRelatedSuggestions(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = `${item.present.join("|")}->${item.suggestions.join("|")}`;
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function levenshteinDistance(a, b) {
  const aa = [...a];
  const bb = [...b];

  const dp = Array.from({ length: aa.length + 1 }, () =>
    Array(bb.length + 1).fill(0)
  );

  for (let i = 0; i <= aa.length; i++) dp[i][0] = i;
  for (let j = 0; j <= bb.length; j++) dp[0][j] = j;

  for (let i = 1; i <= aa.length; i++) {
    for (let j = 1; j <= bb.length; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[aa.length][bb.length];
}

function getTagIssueContextAroundSpace(tags, index) {
  const left = tags.slice(0, index);
  const right = tags.slice(index);

  const leftMatch = left.match(/[^\s　]+$/);
  const rightMatch = right.match(/^[\s　]+[^\s　]+/);

  const leftWord = leftMatch ? leftMatch[0] : "";
  const rightPart = rightMatch ? rightMatch[0] : "";

  return `${leftWord}${rightPart}`.trim();
}