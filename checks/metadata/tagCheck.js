const TAG_SPELLING_DICTIONARY = [
  // MPG / mapping
  "featured", "artist", "mappers'", "guild", "tiebreaker", "qualifiers", "quarterfinals", "semifinals", "grand","finals",

  // genres / style
  "artcore", "anime", "ambient", "ethnic", "extratone", "hardcore", "hardtek",
  "melodic", "techno", "hardstyle", "psystyle", "psytrance", "trance",
  "electropop", "future", "female", "vocalist",
  "vocaloid", "electronic", "instrumental", "hitech", "hi-tech",
  "gothic", "speedcore", "splittercore", "otogecore", "frenchcore",
  "200step", "dubstep", "drumstep", "chiptune", "breakcore", "piano",
  "mechakuchacore", "hypertrance", "terrorcore", "jungle", "metal",
  "gabber", "gabba", "guitar", "glitch", "celtic", "music",
  "schranz", "nightcore", "house", "ballade", "ballad",
  "hip-hop", "funkot", "mákina", "eurodance",
  "eurobeat", "jodeln", "reggae", "waltz", "bootleg",
  "remix", "lolicore", "utattemita", "nerdcore",
  "hyperflip", "dariacore", "plunderphonics", "mashup", "mashcore", "hyperpop", "chunithm"
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
    trigger: ["上海アリス幻樂団"],
    suggestGroup: ["上海アリス幻樂団", "team", "shanghai", "alice", "gengakudan"]
  },
  {
    triggerAll: ["shanghai", "alice"],
    suggestGroup: ["上海アリス幻樂団", "team", "shanghai", "alice", "gengakudan"]
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
    trigger: ["バーチャルyoutuber", "vtuber"],
    suggestGroup: ["バーチャルyoutuber", "virtual", "youtuber", "vtuber"]
  },
  {
    triggerAll: ["virtual", "youtuber"],
    suggestGroup: ["バーチャルyoutuber", "vtuber"]
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
    trigger: ["プロジェクトセカイ", "プロセカ", "proseka", "puroseka", "prsk", "pjsk"],
    suggestGroup: ["プロジェクトセカイ", "カラフルステージ！", "feat.", "初音ミク", "プロセカ", "proseka", "puroseka", "project", "sekai", "hatsune", "miku:", "colorful", "stage!", "prsk", "pjsk"]
  },
  {
    triggerAll: ["project", "sekai"],
    suggestGroup: ["プロジェクトセカイ", "カラフルステージ！", "feat.", "初音ミク", "プロセカ", "proseka", "puroseka", "project", "sekai", "hatsune", "miku:", "colorful", "stage!", "prsk", "pjsk"]
  },
  {
    trigger: ["25時、ナイトコードで。", "25-ji,", "nightcord", "25:00", "ニーゴ", "ni-go", "niigo"],
    suggestGroup: ["25時、ナイトコードで。", "25-ji,", "25ji", "nightcord", "de.", "at", "25:00", "ニーゴ", "ni-go", "niigo"]
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
    trigger: ["ポップンミュージック", "ポップン", "pop'n"],
    suggestGroup: ["ポップンミュージック", "ポップン", "pop'n", "popn", "poppun", "music"]
  },
  {
    triggerAll: ["pop'n", "music"],
    suggestGroup: ["ポップンミュージック", "ポップン", "pop'n", "popn", "poppun", "music"]
  },
  {
    trigger: ["sdvx"],
    suggestGroup: ["sound", "voltex", "sdvx"]
  },
  {
    triggerAll: ["sound", "voltex"],
    suggestGroup: ["sdvx"]
  },
  {
    trigger: ["オンゲキ", "ongeki", "o.n.g.e.k.i."],
    suggestGroup: ["オンゲキ", "ongeki", "o.n.g.e.k.i."]
  },
  {
    trigger: ["チュウニズム", "chunithm"],
    suggestGroup: ["チュウニズム", "chunithm"]
  },
  {
    triggerAll: ["maimai", "でらっくす"],
    suggestGroup: ["maimai", "でらっくす", "deluxe", "dx"]
  },
  {
    triggerAll: ["maimai", "deluxe"],
    suggestGroup: ["maimai", "でらっくす", "deluxe", "dx"]
  },
  {
    triggerAll: ["maimai", "dx"],
    suggestGroup: ["maimai", "でらっくす", "deluxe", "dx"]
  },
  {
    trigger: ["アニメ", "anime", "animation"],
    suggestGroup: ["アニメ", "anime", "animation"]
  },
  {
    trigger: ["opening", "op"],
    suggestGroup: ["opening", "theme", "op"]
  },
  {
    trigger: ["ending", "ed"],
    suggestGroup: ["ending", "theme", "ed"]
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
  {
    trigger: ["ブルーアーカイブ", "ブルアカ", "buruaka", "blueaka"],
    suggestGroup: ["ブルアカ", "buruaka", "blueaka", "yostar", "nexon", "games"]
  },
  {
    triggerAll: ["-Blue", "Archive-"],
    suggestGroup: ["ブルーアーカイブ", "ブルアカ", "buruaka", "blueaka", "yostar", "nexon", "games"]
  },
];

const TAG_SOURCE_RULES = [
  {
    source: ["東方"],
    tags: ["東方project", "東方", "touhou", "project"]
  },
  {
    source: ["osu!"],
    tags: ["osu!", "original"]
  },
  {
    source: ["太鼓の達人"],
    tags: ["taiko", "no", "tatsujin", "tnt"]
  },
  {
    source: ["sound voltex"],
    tags: ["sdvx"]
  },
  {
    source: ["オンゲキ"],
    tags: ["ongeki", "o.n.g.e.k.i."]
  },
  {
    source: ["maimai でらっくす"],
    tags: ["deluxe", "dx"]
  },
  {
    source: ["chunithm"],
    tags: ["チュウニズム"]
  },
  {
    source: ["pop'n music"],
    tags: ["ポップンミュージック", "ポップン", "popn", "poppun"]
  },
  {
    source: ["プロジェクトセカイ カラフルステージ！"],
    tags: [
      "プロセカ",
      "proseka",
      "puroseka",
      "project",
      "sekai",
      "hatsune",
      "miku:",
      "colorful",
      "stage!",
      "prsk",
      "pjsk"
    ]
  },
  {
    source: ["ブルーアーカイブ -Blue Archive-"],
    tags: ["ブルアカ", "buruaka", "blueaka", "yostar", "nexon", "games"]
  },
];

function runTagCheck(text, fileName) {
  const tagsLine = findMetadataTagsLine(text);
  const sourceLine = findMetadataLine(text, "Source");
  const metadataFields = [
    { field: "Title", value: findMetadataLine(text, "Title")?.value },
    { field: "TitleUnicode", value: findMetadataLine(text, "TitleUnicode")?.value },
    { field: "Artist", value: findMetadataLine(text, "Artist")?.value },
    { field: "ArtistUnicode", value: findMetadataLine(text, "ArtistUnicode")?.value },
    { field: "Source", value: sourceLine?.value }
  ];
  const results = [];
  const spellingSuggestions = [];
  const relatedSuggestions = [];
  const metadataSuggestions = [];
  const sourceSuggestions = [];
  const duplicateTags = [];
  const metadataDuplicateTags = [];

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
      relatedSuggestions,
      metadataSuggestions,
      duplicateTags,
      metadataDuplicateTags,
      sourceSuggestions
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
  relatedSuggestions.push(...findTagRelatedSuggestions(tags, sourceLine?.value ?? ""));
  metadataSuggestions.push(...findFeatTagSuggestions(tags, metadataFields));
  metadataSuggestions.push(...findVersionTagSuggestions(tags, metadataFields));
  duplicateTags.push(...findDuplicateTags(tags));
  metadataDuplicateTags.push(...findMetadataDuplicateTags(tags, metadataFields));
  sourceSuggestions.push(
    ...findSourceTagSuggestions(
      sourceLine?.value ?? "",
      tags
    )
  );

  return {
    fileName,
    tags,
    normalizedTags,
    results,
    spellingSuggestions,
    relatedSuggestions,
    metadataSuggestions,
    duplicateTags,
    metadataDuplicateTags,
    sourceSuggestions
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

function findMetadataLine(text, key) {
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

      if (trimmed.startsWith(`${key}:`)) {
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

function findDuplicateTags(tags) {
  const map = new Map();

  for (const tag of getTagWords(tags)) {
    const normalized = normalizeTagToken(tag);
    if (!normalized) continue;

    if (!map.has(normalized)) {
      map.set(normalized, {
        tag,
        count: 0,
        variants: []
      });
    }

    const item = map.get(normalized);
    item.count++;

    if (!item.variants.includes(tag)) {
      item.variants.push(tag);
    }
  }

  return [...map.values()]
    .filter(item => item.count >= 2);
}

function findMetadataDuplicateTags(tags, metadataFields) {
  const tagMap = new Map();

  for (const tag of getTagWords(tags)) {
    const normalized = normalizeTagToken(tag);
    if (!normalized || tagMap.has(normalized)) continue;

    tagMap.set(normalized, tag);
  }

  const duplicateMap = new Map();

  for (const item of metadataFields) {
    const field = item.field;

    for (const metadataTag of getTagWords(item.value ?? "")) {
      const normalized = normalizeTagToken(metadataTag);
      if (!normalized || !tagMap.has(normalized)) continue;

      if (!duplicateMap.has(normalized)) {
        duplicateMap.set(normalized, {
          tag: tagMap.get(normalized),
          fields: [],
          metadataVariants: []
        });
      }

      const duplicate = duplicateMap.get(normalized);

      if (!duplicate.fields.includes(field)) {
        duplicate.fields.push(field);
      }

      if (!duplicate.metadataVariants.includes(metadataTag)) {
        duplicate.metadataVariants.push(metadataTag);
      }
    }
  }

  return [...duplicateMap.values()];
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

function findTagRelatedSuggestions(tags, source = "") {
  const words = getNormalizedTagWords(tags);
  const wordSet = new Set(words);

  const normalizedSource = normalizeSourceForTagCompare(source);

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

    if (trigger.length) {
      presentTriggers = trigger.filter(tag =>
        wordSet.has(tag)
      );

      if (presentTriggers.length) {
        matched = true;
      }
    }

    if (!matched && triggerAll.length) {
      const allPresent =
        triggerAll.every(tag =>
          wordSet.has(tag)
        );

      if (allPresent) {
        matched = true;
        presentTriggers = triggerAll;
      }
    }

    if (!matched) continue;

    const presentSuggestions =
      suggestGroup.filter(tag => wordSet.has(tag));

    const presentSourceSuggestions =
      suggestGroup.filter(tag =>
        !wordSet.has(tag) && sourceContainsTag(normalizedSource, tag)
      );

    const missing =
      suggestGroup.filter(tag =>
        !wordSet.has(tag) && !sourceContainsTag(normalizedSource, tag)
      );

    if (!missing.length) continue;

    suggestions.push({
      present: presentTriggers,
      presentSuggestions,
      presentSourceSuggestions,
      suggestions: missing
    });
  }

  return dedupeTagRelatedSuggestions(suggestions);
}

function findFeatTagSuggestions(tags, metadataFields) {
  const fields = metadataFields
    .filter(item => /\bfeat\./i.test(String(item.value ?? "")))
    .map(item => item.field);

  if (!fields.length) return [];

  const wordSet = new Set(getNormalizedTagWords(tags));
  const suggestions = ["featuring", "ft."]
    .filter(tag => !wordSet.has(normalizeTagToken(tag)));

  if (!suggestions.length) return [];

  return [{
    fields,
    marker: "feat.",
    suggestions
  }];
}

function findVersionTagSuggestions(tags, metadataFields) {
  const fields = metadataFields
    .filter(item =>
      ["Title", "TitleUnicode"].includes(item.field) &&
      /\bver\./i.test(String(item.value ?? ""))
    )
    .map(item => item.field);

  if (!fields.length) return [];

  const wordSet = new Set(getNormalizedTagWords(tags));
  const suggestions = ["version"]
    .filter(tag => !wordSet.has(normalizeTagToken(tag)));

  if (!suggestions.length) return [];

  return [{
    fields,
    marker: "Ver.",
    suggestions
  }];
}

function normalizeSourceForTagCompare(source) {
  return String(source)
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceContainsTag(normalizedSource, tag) {
  const normalizedTag = normalizeTagToken(tag);

  if (!normalizedTag) return false;

  return normalizedSource.includes(normalizedTag);
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

    const presentSourceSuggestions =
      [...new Set(item.presentSourceSuggestions ?? [])].sort();

    const key = [
      suggestions.join("|"),
      presentSourceSuggestions.join("|")
    ].join("::");

    if (!map.has(key)) {
      map.set(key, {
        present: [],
        presentSuggestions: [],
        presentSourceSuggestions: [],
        suggestions
      });
    }

    const existing = map.get(key);

    existing.present.push(...(item.present ?? []));
    existing.presentSuggestions.push(...(item.presentSuggestions ?? []));
    existing.presentSourceSuggestions.push(...(item.presentSourceSuggestions ?? []));

    existing.present = [...new Set(existing.present)].sort();
    existing.presentSuggestions = [...new Set(existing.presentSuggestions)].sort();
    existing.presentSourceSuggestions = [...new Set(existing.presentSourceSuggestions)].sort();
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

function findSourceTagSuggestions(source, tags) {
  const normalizedSource = String(source).toLowerCase();
  const tagWords = getNormalizedTagWords(tags);
  const tagSet = new Set(tagWords);

  const suggestions = [];

  for (const rule of TAG_SOURCE_RULES) {
    const matched =
      rule.source.some(keyword =>
        normalizedSource.includes(keyword.toLowerCase())
      );

    if (!matched) continue;

    const normalizedTags =
      rule.tags.map(normalizeTagToken);

    const missing =
      normalizedTags.filter(tag => !tagSet.has(tag));

    if (!missing.length) continue;

    suggestions.push({
      source: rule.source[0],
      expectedTags: normalizedTags,
      suggestions: missing
    });
  }

  return suggestions;
}
