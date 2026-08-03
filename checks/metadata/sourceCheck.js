const TOUHOU_SOURCE_LIST = [
  {
    name: "東方紺珠伝　～ Legacy of Lunatic Kingdom.",
    link: "https://www16.big.or.jp/~zun/html/th15top.html"
  },
  {
    name: "東方輝針城　～ Double Dealing Character.",
    link: "https://www16.big.or.jp/~zun/html/th14top.html"
  },
  {
    name: "東方神霊廟　～ Ten Desires.",
    link: "https://www16.big.or.jp/~zun/html/th13top.html"
  },
  {
    name: "東方星蓮船　～ Undefined Fantastic Object.",
    link: "https://www16.big.or.jp/~zun/html/th12top.html"
  },
  {
    name: "東方地霊殿　～ Subterranean Animism.",
    link: "https://www16.big.or.jp/~zun/html/th11top.html"
  },
  {
    name: "東方風神録　～ Mountain of Faith.",
    link: "https://www16.big.or.jp/~zun/html/th10top.html"
  },
  {
    name: "東方花映塚　～ Phantasmagoria of Flower View.",
    link: "https://www16.big.or.jp/~zun/html/th09top.html"
  },
  {
    name: "東方永夜抄　～ Imperishable Night.",
    link: "https://www16.big.or.jp/~zun/html/th08top.html"
  },
  {
    name: "東方萃夢想　～ Immaterial and Missing Power.",
    link: "https://www16.big.or.jp/~zun/html/th075.html"
  },
  {
    name: "東方妖々夢　～ Perfect Cherry Blossom.",
    link: "https://www16.big.or.jp/~zun/html/th07.html"
  },
  {
    name: "東方紅魔郷　～ the Embodiment of Scarlet Devil.",
    link: "https://www16.big.or.jp/~zun/html/th06.html"
  },
  {
    name: "東方文花帖　～ Shoot the Bullet.",
    link: "https://touhou-project.news/titles/th095/"
  },
  {
    name: "東方緋想天　～ Scarlet Weather Rhapsody.",
    link: "https://touhou-project.news/titles/th105/"
  },
  {
    name: "東方非想天則　～ 超弩級ギニョルの謎を追え",
    link: "https://touhou-project.news/titles/th123/"
  },
  {
    name: "ダブルスポイラー　～ 東方文花帖ゲーム",
    link: "https://touhou-project.news/titles/th125/"
  },
  {
    name: "妖精大戦争　～ 東方三月精",
    link: "https://touhou-project.news/titles/th128/"
  },
  {
    name: "東方剛欲異聞　～ 水没した沈愁地獄",
    link: "https://touhou-project.news/titles/th175/"
  },
  {
    name: "東方虹龍洞　〜 Unconnected Marketeers.",
    link: "https://touhou-project.news/titles/th18/"
  },
  {
    name: "東方鬼形獣　～ Wily Beast and Weakest Creature.",
    link: "https://touhou-project.news/titles/th17/"
  },
  {
    name: "東方憑依華　～ Antinomy of Common Flowers.",
    link: "https://touhou-project.news/titles/th155/"
  },
  {
    name: "東方天空璋　～ Hidden Star in Four Seasons.",
    link: "https://touhou-project.news/titles/th16/"
  },
  {
    name: "東方深秘録　～ Urban Legend in Limbo.",
    link: "https://touhou-project.news/titles/th145/"
  },
  {
    name: "東方心綺楼　～ Hopeless Masquerade.",
    link: "https://touhou-project.news/titles/th135/"
  },
  {
    name: "東方獣王園 〜 Unfinished Dream of All Living Ghost.",
    link: "https://touhou-project.news/titles/th19/"
  },
  {
    name: "弾幕アマノジャク　～ Impossible Spell Card.",
    link: "https://touhou-project.news/titles/th143/"
  },
  {
    name: "秘封ナイトメアダイアリー　～ Violet Detector.",
    link: "https://touhou-project.news/titles/th165/"
  },
  {
    name: "バレットフィリア達の闇市場　〜 100th Black Market.",
    link: "https://touhou-project.news/titles/th185/"
  },
  {
    name: "東方靈異伝　～ Highly Responsive to Prayers",
    link: "http://thwiki.info/"
  },
  {
    name: "東方封魔録　～ the Story of Eastern Wonderland",
    link: "http://thwiki.info/"
  },
  {
    name: "東方夢時空　～ Phantasmagoria of Dim.Dream",
    link: "http://thwiki.info/th/yume/"
  },
  {
    name: "東方幻想郷　～ Lotus Land Story",
    link: "http://thwiki.info/"
  },
  {
    name: "東方怪綺談　～ Mystic Square",
    link: "http://thwiki.info/"
  }
];

const BLUE_ARCHIVE_SOURCE = "ブルーアーカイブ -Blue Archive-";
const PROJECT_SEKAI_SOURCE = "プロジェクトセカイ カラフルステージ！";
const UMA_MUSUME_SOURCE = "ウマ娘 プリティーダービー";

function findSourceFormattingSuggestion(source) {
  const normalized = String(source ?? "").trim();
  const lower = normalized.toLowerCase();

  if (
    normalized !== BLUE_ARCHIVE_SOURCE &&
    (normalized === "ブルーアーカイブ" || lower === "blue archive")
  ) {
    return { expected: BLUE_ARCHIVE_SOURCE };
  }

  if (
    normalized !== PROJECT_SEKAI_SOURCE &&
    (
      normalized.includes("プロジェクトセカイ") ||
      lower.includes("project sekai")
    )
  ) {
    return { expected: PROJECT_SEKAI_SOURCE };
  }

  if (
    normalized !== UMA_MUSUME_SOURCE &&
    normalized.includes("ウマ娘")
  ) {
    return { expected: UMA_MUSUME_SOURCE };
  }

  return null;
}

function normalizeTouhouSourceLoose(source) {
  return String(source ?? "")
    .trim()
    .toLowerCase()
    .replace(/[　\s]/g, "")
    .replace(/[～〜~]/g, "～")
    .replace(/[.。]/g, "");
}

function runSourceCheck(text, fileName) {
  const source = parseSource(text);

  if (!source) {
    return {
      fileName,
      level: "none",
      message: "Source not found"
    };
  }

  const normalized = source.trim();
  const sourceFormatting = findSourceFormattingSuggestion(normalized);
  const finalize = result => {
    if (!sourceFormatting) return result;

    return {
      ...result,
      level: result.level === "error" ? "error" : "warn",
      sourceFormatting
    };
  };

  const looseNormalized = normalizeTouhouSourceLoose(normalized);

  // 汎用ワードだけ
  if (/^(東方|東方project|東方 project|touhou|touhou project)$/i.test(normalized)) {
    return finalize({
      fileName,
      level: "warn",
      source,
      type: "generic"
    });
  }

  // 完全一致
  const exact = TOUHOU_SOURCE_LIST.find(
    item => item.name === normalized
  );

  if (exact) {
    return finalize({
      fileName,
      level: "ok",
      source,
      type: "exact",
      link: exact.link
    });
  }

  // ゆるい一致
  const partial = TOUHOU_SOURCE_LIST.find(item =>
    normalizeTouhouSourceLoose(item.name) === looseNormalized
  );

  if (partial) {
    return finalize({
      fileName,
      level: "error",
      source,
      type: "partial",
      expected: partial.name,
      link: partial.link
    });
  }

  // 東方っぽい文字列 or 東方作品候補
  const looksTouhou =
    /東方|touhou/i.test(normalized) ||
    TOUHOU_SOURCE_LIST.some(item => {
      const itemNormalized = normalizeTouhouSourceLoose(item.name);

      return (
        itemNormalized.includes(looseNormalized) ||
        looseNormalized.includes(itemNormalized)
      );
    });

  if (!looksTouhou) {
    return finalize({
      fileName,
      level: "none",
      source,
      type: "notTouhou"
    });
  }

  // 不明な東方作品っぽい
  return finalize({
    fileName,
    level: "warn",
    source,
    type: "unknown"
  });
}

function parseSource(text) {
  const lines = text.split(/\r?\n/);
  let inMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Metadata]") {
      inMetadata = true;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("Source:")) {
        return line.slice(line.indexOf(":") + 1).trim();
      }
    }
  }

  return "";
}

function normalizeSourceForCompare(source) {
  return String(source ?? "")
    .trim()
    .replace(/　/g, " ")
    .replace(/\s+/g, " ");
}

function compareSourcesAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      base: results?.[0] ?? null,
      mismatches: []
    };
  }

  const base = results[0];
  const baseSource = normalizeSourceForCompare(base.source ?? "");

  const mismatches = [];

  for (const result of results.slice(1)) {
    const source = normalizeSourceForCompare(result.source ?? "");

    if (source === baseSource) continue;

    mismatches.push({
      fileName: result.fileName,
      baseFileName: base.fileName,
      source: result.source ?? "",
      baseSource: base.source ?? ""
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}
