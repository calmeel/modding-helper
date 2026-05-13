const TAG_SPELLING_DICTIONARY = [
  // MPG / mapping
  "featured", "artist", "mappers'", "guild", "tiebreaker", "qualifiers", "quarterfinals", "semifinals", "grand","finals",

  // genres / style
  "artcore", "anime", "ambient", "edm", "ethnic", "extratone", "hardcore", "hardtek",
  "melodic", "techno", "hardstyle", "psystyle", "psytrance", "trance",
  "electropop", "future", "bass", "female", "vocalist",
  "vocaloid", "jazz", "electronic", "instrumental", "hitech", "hi-tech",
  "gothic", "speedcore", "splittercore", "otogecore", "frenchcore",
  "200step", "dubstep", "drumstep", "chiptune", "breakcore", "piano",
  "mechakuchacore", "hypertrance", "terrorcore", "jungle", "metal",
  "gabber", "gabba", "guitar", "glitch", "celtic", "music",
  "schranz", "trap", "nightcore", "house", "ballade", "ballad",
  "hip-hop", "funk", "folk", "funkot", "mákina", "eurodance",
  "eurobeat", "jodeln", "reggae", "waltz", "bootleg",
  "remix", "lolicore", "utattemita", "nerdcore",
  "hyperflip", "dariacore", "plunderphonics", "mashup", "mashcore", "hyperpop"
];

const TAG_RELATED_RULES = [
  {
    triggerAll: ["featured", "artist"],
    suggestGroup: ["fa"]
  },
  {
    trigger: ["mpg"],
    suggestGroup: ["mappers'", "guild", "mg"]
  },
  {
    triggerAll: ["mappers'", "guild"],
    suggestGroup: ["mg", "mpg"]
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
    triggerAll: ["hip", "hop"],
    suggestGroup: ["hiphop", "hip-hop"]
  },
  {
    trigger: ["hitech", "hi-tech"],
    suggestGroup: ["hitech", "hi-tech"]
  },
  {
    trigger: ["hyperpop"],
    suggestGroup: ["hyperpop", "hyper", "pop"]
  },
  {
    triggerAll: ["hyper", "pop"],
    suggestGroup: ["hyperpop"]
  },
  {
    trigger: ["hyperflip", "dariacore"],
    suggestGroup: ["hyperflip", "dariacore", "plunderphonics", "mashup", "mashcore", "remix", "bootleg"]
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
    triggerAll: ["female", "vocals"],
    suggestGroup: ["female", "vocals", "vocalist"]
  },
  {
    triggerAll: ["male", "vocals"],
    suggestGroup: ["male", "vocals", "vocalist"]
  },
  {
    trigger: ["psytrance"],
    suggestGroup: ["psychedelic", "trance", "psytrance"]
  },
  {
    triggerAll: ["psychedelic", "trance"],
    suggestGroup: ["psytrance"]
  },
  {
    trigger: ["ボカロ", "ボーカロイド", "vocaloid"],
    suggestGroup: ["ボカロ", "ボーカロイド", "vocaloid"]
  },
  {
    triggerAll: ["synthesizer", "v"],
    suggestGroup: ["synthesizer", "synthv", "v", "sv"]
  },
  {
    trigger: ["東方project", "東方", "touhou"],
    suggestGroup: ["東方project", "東方", "touhou", "project"]
  },
  {
    triggerAll: ["東方", "project"],
    suggestGroup: ["東方project", "touhou"]
  },
  {
    trigger: ["drum'n'bass", "dnb", "d&b", "d'n'b"],
    suggestGroup: ["drum", "and", "&", "bass", "drum'n'bass", "dnb", "d&b", "d'n'b"]
  },
  {
    triggerAll: ["drum", "bass"],
    suggestGroup: ["drum", "and", "&", "bass", "drum'n'bass", "dnb", "d&b", "d'n'b"]
  },
  {
    trigger: ["vtuber"],
    suggestGroup: ["virtual", "youtuber", "vtuber"]
  },
  {
    triggerAll: ["virtual", "youtuber"],
    suggestGroup: ["vtuber"]
  },
  {
    trigger: ["vn"],
    suggestGroup: ["visual", "novel"]
  },
  {
    triggerAll: ["visual", "novel"],
    suggestGroup: ["vn"]
  },
  {
    trigger: ["ost"],
    suggestGroup: ["original", "soundtrack"]
  },
  {
    triggerAll: ["original", "soundtrack"],
    suggestGroup: ["ost"]
  },
  {
    trigger: ["vgm"],
    suggestGroup: ["video", "game", "videogame"]
  },
  {
    triggerAll: ["video", "game"],
    suggestGroup: ["videogame", "vgm"]
  },
  {
    trigger: ["歌ってみた", "utattemita"],
    suggestGroup: ["歌ってみた", "utattemita"]
  },
  {
    trigger: ["音mad", "音窓", "otomad", "oto-mad"],
    suggestGroup: ["音mad", "音窓", "oto", "mad", "otomad", "oto-mad"]
  },
  {
    triggerAll: ["oto", "mad"],
    suggestGroup: ["音mad", "音窓", "otomad", "oto-mad"]
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
    triggerAll: ["project", "sekai"],
    suggestGroup: ["プロセカ", "proseka", "puroseka", "colorful", "stage!", "prsk", "pjsk"]
  },
  {
    trigger: ["太鼓の達人"],
    suggestGroup: ["太鼓の達人", "taiko", "no", "tatsujin", "tnt"]
  },
  {
    triggerAll: ["taiko", "no", "tatsujin"],
    suggestGroup: ["太鼓の達人", "tnt"]
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
    trigger: ["qualifiers", "qlf"],
    suggestGroup: ["qualifiers", "qlf"]
  },
  {
    trigger: ["ro16"],
    suggestGroup: ["round", "of", "16", "ro16"]
  },
  {
    triggerAll: ["round", "of", "16"],
    suggestGroup: ["ro16"]
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
    triggerAll: ["grand", "finals"],
    suggestGroup: ["gf"]
  },
  {
    trigger: ["tiebreaker", "tb"],
    suggestGroup: ["tiebreaker", "tb"]
  },
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

  const base = results[0];
  const baseTags = base.tags ?? "";
  const baseNormalizedTags = normalizeTagsForCompare(baseTags);
  const baseWords = getTagWords(baseTags);
  const baseSet = new Set(baseWords.map(normalizeTagToken));

  const mismatches = [];

  for (const result of results.slice(1)) {
    const tags = result.tags ?? "";
    const normalizedTags = normalizeTagsForCompare(tags);

    if (normalizedTags === baseNormalizedTags) continue;

    const words = getTagWords(tags);
    const set = new Set(words.map(normalizeTagToken));

    const removed = baseWords.filter(tag => !set.has(normalizeTagToken(tag)));
    const added = words.filter(tag => !baseSet.has(normalizeTagToken(tag)));

    mismatches.push({
      fileName: result.fileName,
      baseFileName: base.fileName,
      removed,
      added,
      tags,
      baseTags
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

    const trigger =
      (rule.trigger ?? []).map(normalizeTagToken);

    const triggerAll =
      (rule.triggerAll ?? []).map(normalizeTagToken);

    const suggestGroup =
      rule.suggestGroup.map(normalizeTagToken);

    let matched = false;
    let presentTriggers = [];

    // 従来: どれか1つ含まれる
    if (trigger.length) {
      presentTriggers = trigger.filter(tag => wordSet.has(tag));

      if (presentTriggers.length) {
        matched = true;
      }
    }

    // 新規: 全部含まれる
    if (!matched && triggerAll.length) {
      const allPresent =
        triggerAll.every(tag => wordSet.has(tag));

      if (allPresent) {
        matched = true;
        presentTriggers = triggerAll;
      }
    }

    if (!matched) continue;

    const missing =
      suggestGroup.filter(tag => !wordSet.has(tag));

    if (!missing.length) continue;

    suggestions.push({
      present: presentTriggers,
      presentSuggestions: suggestGroup.filter(tag => wordSet.has(tag)),
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
  const map = new Map();

  for (const item of items) {
    const suggestions = [...new Set(item.suggestions)].sort();
    if (!suggestions.length) continue;

    const key = suggestions.join("|");

    if (!map.has(key)) {
      map.set(key, {
        present: [],
        presentSuggestions: [],
        suggestions
      });
    }

    const existing = map.get(key);

    existing.present.push(...(item.present ?? []));
    existing.presentSuggestions.push(...(item.presentSuggestions ?? []));

    existing.present = [...new Set(existing.present)].sort();
    existing.presentSuggestions = [...new Set(existing.presentSuggestions)].sort();
  }

  return [...map.values()];
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