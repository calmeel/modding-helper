const CONTENT_PERMISSION_RULES = [
  {
    category: "disallowedArtist",
    level: "error",

    fields: ["artist", "artistUnicode", "title", "titleUnicode"],

    keywords: [
      "40mP",
      "a_hisa",
      "Draw the Emotional",
      "Enter Shikari",
      "EZFG",
      "Hatsuki Yura",
      "kamome sano",
      "kozato",
      "NOMA"
    ],

    title: "Disallowed artists",

    messageJa:
      "このアーティストは osu!official 上で使用が許可されていません。使用しないでください。",

    messageEn:
      "This artist is disallowed by osu!official. Do not use this content.",

    link: "https://osu.ppy.sh/wiki/ja/Rules/Content_usage_permissions"
  },
  {
    category: "disallowedArtist",
    level: "error",

    fields: ["source", "tags"],

    keywords: [
      "dj max",
      "djmax",
      "neowiz"
    ],

    title: "Disallowed labels",

    messageJa:
      "このレーベルは osu!official 上で使用が許可されていません。使用しないでください。",

    messageEn:
      "This label is disallowed by osu!official. Do not use this content.",

    link: "https://osu.ppy.sh/wiki/ja/Rules/Content_usage_permissions"
  },
  {
    category: "conditionalLabel",
    level: "warn",

    fields: ["source", "tags"],

    keywords: [
      "megarex"
    ],

    title: "Conditional label permissions",

    messageJa:
      "このレーベルは osu!official 上で条件付きで使用が許可されています。使用条件を確認してください。",

    messageEn:
      "This label is conditionally allowed by osu!official. Please verify the usage conditions.",

    link: "https://osu.ppy.sh/wiki/ja/Rules/Content_usage_permissions"
  },
  {
    category: "conditionalArtist",
    level: "warn",

    fields: ["artist", "artistUnicode", "title", "titleUnicode"],

    keywords: [
      "ak+q",
      "Akira Complex",
      "Frums",
      "gxxberlol",
      "HoneyComeBear",
      "Igorrr",
      "Jun Kuroda",
      "Lusumi",
      "Mlumìn",
      "SoundWarper",
      "Morimori Atsushi",
      "Reku Mochizuki",
      "Silentroom",
      "Synthion",
      "Yuyoyuppe",
      "DJ'TEKINA//SOMETHING",
      "Zekk"
    ],

    title: "Conditional artist permissions",

    messageJa:
      "このアーティストは osu!official 上で条件付きで使用が許可されています。使用条件を確認してください。",

    messageEn:
      "This artist is conditionally allowed by osu!official. Please verify the usage conditions.",

    link:
      "https://osu.ppy.sh/wiki/ja/Rules/Content_usage_permissions"
  },
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode"],

  keywords: [
    "ぱらどっと",
    "para dot."
  ],

  title: "Personal upload ban",

  messageJa:
    "このアーティストは osu! へのアップロードを禁止しています。使用前にガイドラインを確認してください。",

  messageEn:
    "This artist prohibits uploads to osu!. Please check the guidelines before use.",

  link:
    "https://x.com/zenerat/status/1621121410361065472"
},
{
  category: "permissionRequired",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode"],

  keywords: [
    "smilybruh"
  ],

  title: "Permission required",

  messageJa:
    "このアーティストは、再配布や mod 使用に許可を要求しています。使用前に確認してください。",

  messageEn:
    "This artist requires permission before reuploads or mod usage. Please check before use.",

  link:
    "https://www.youtube.com/channel/UC9EQzfp2ibv8JnP4ZXjwPyg"
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "arcaea"
  ],

  title: "Derivative work restriction",

  messageJa:
    "このコンテンツには二次利用ガイドラインがあります。Featured Artist かどうか確認してください。",

  messageEn:
    "This content has derivative work restrictions. Please verify whether it is a Featured Artist track.",

  links: [
    {
      label: "日本語ガイドライン",
      url: "https://arcaea.lowiro.com/ja/derivative_policy"
    },
    {
      label: "English Guidelines",
      url: "https://arcaea.lowiro.com/en/derivative_policy"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "hardcore tano*c"
  ],

  title: "Derivative work restriction",

  messageJa:
    "このレーベルには利用ガイドラインがあります。Featured Artist かどうか確認してください。",

  messageEn:
    "This label has usage restrictions. Please verify whether it is a Featured Artist track.",

  link:
    "https://www.tano-c.net/copyright/"
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode"],

  keywords: [
    "slave.v-v-r"
  ],

  title: "Personal upload restriction",

  messageJa:
    "このアーティストには楽曲利用ガイドラインがあります。使用前に確認してください。",

  messageEn:
    "This artist has music usage guidelines. Please check them before use.",

  links: [
    {
      label: "日本語ガイドライン",
      url: "https://slave-vvr.jimdofree.com/%E6%A5%BD%E6%9B%B2%E5%88%A9%E7%94%A8%E6%99%82%E3%81%AE%E3%82%AC%E3%82%A4%E3%83%89%E3%83%A9%E3%82%A4%E3%83%B3-guidelines-for-using-music/"
    },
    {
      label: "English Guidelines",
      url: "https://slave-vvr.jimdofree.com/%E6%A5%BD%E6%9B%B2%E5%88%A9%E7%94%A8%E6%99%82%E3%81%AE%E3%82%AC%E3%82%A4%E3%83%89%E3%83%A9%E3%82%A4%E3%83%B3-guidelines-for-using-music/english/"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "魔法少女ノ魔女裁判"
  ],

  title: "Derivative work restriction",

  messageJa:
    "このコンテンツには利用ガイドラインがあります。使用前に確認してください。",

  messageEn:
    "This content has usage guidelines. Please check them before use.",

  link:
    "https://manosaba.com/guidelines"
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode"],

  keywords: [
    "skrillex"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/65634825af9a9f237407/raw"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode"],

  keywords: [
    "cosmograph",
    "lunatic sounds",
    "ArcadeStuff",
    "HousePlan"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/5d72d1e7f743c7ed0709a1d2983e8429/raw"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "konami",
    "beatmania",
    "jubeat",
    "sound voltex",
    "dance dance revolution",
    "reflect beat"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/15bd77feb938322e05e6ef18a99b1572/raw"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode"],

  keywords: [
    "ado"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/418364abd1b74b95150b87b7c831001a/raw/dmca_20221208.txt"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "アイドルマスター"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/6b91dea9835cd49ddee13794f6deeb5a/raw/dmca_20221005.txt"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode"],

  keywords: [
    "luis fonsi"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/8db598fbc8c2caae1ea62484671f3909/raw"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "alcot"
  ],

  title: "Past DMCA / music usage restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインにより楽曲の使用は原則禁止されています。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice, and music usage is generally prohibited by the guidelines. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/88aa53abb51d2718244f/raw"
    },
    {
      label: "Guidelines",
      url: "https://www.alcot.biz/information.html"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "rayark",
    "cytus",
    "deemo",
    "voez"
  ],

  title: "Past DMCA / derivative work restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインによりアップロードが制限されています。Featured Artist かどうか確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice and upload is restricted by the guidelines. Please verify whether it is a Featured Artist track.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/55e7ee271342766a80f3596d8e5c83fa/raw/dmca_20220328.txt"
    },
    {
      label: "Guidelines (EN)",
      url: "https://www.terms.rayark.com/terms-en"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "hooksoft"
  ],

  title: "Past DMCA / derivative work restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインにより利用が制限されています。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice and usage is restricted by the guidelines. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/e34cbd3f9a30cc41b327d4f2555cd29e/raw/dmca_20230306.txt"
    },
    {
      label: "Guidelines",
      url: "https://www.hook-net.jp/htm/about.htm"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["title", "titleUnicode"],

  keywords: [
    "love loading!!!",
    "サニスコープ",
    "カナリーブロッサム",
    "one two trap!!",
    "春は詩と共に",
    "僕らのwatercolor",
    "ultimate breaKING",
    "day before memory",
    "ヒミツプラネット",
    "それが恋になった日",
    "ミリオンタイムズ",
    "love gotcha!",
    "ブルーカーペット",
    "きみがいちばんばんばんざ～い!",
    "オープニングセレモニー",
    "cinderella street",
    "girls’ carnival",
    "ハレノヒステップ"
  ],

  title: "Past DMCA / derivative work restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインにより利用が制限されています。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice and usage is restricted by the guidelines. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/e34cbd3f9a30cc41b327d4f2555cd29e/raw/dmca_20230306.txt"
    },
    {
      label: "Guidelines",
      url: "https://www.hook-net.jp/htm/about.htm"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "ケロq",
    "枕"
  ],

  title: "Past DMCA / music usage restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインにより楽曲の使用は原則禁止されています。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice, and music usage is generally prohibited by the guidelines. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/bdf2cf1647765cf692664871d73d451b/raw/dmca_2023-03-03.txt"
    },
    {
      label: "Guidelines",
      url: "https://www.keromakura.net/support/support/guideline.html"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["title", "titleUnicode"],

  keywords: [
    "櫻ノ詩",
    "空気力学少女と少年の詩",
    "刻ト詩",
    "ナグルファルの船上にて",
    "登れない坂道",
    "終末の微笑",
    "片翼のイカロス",
    "カザハネ",
    "スイッチ・オン♪",
    "機械人形"
  ],

  title: "Past DMCA / music usage restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインにより楽曲の使用は原則禁止されています。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice, and music usage is generally prohibited by the guidelines. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/bdf2cf1647765cf692664871d73d451b/raw/dmca_2023-03-03.txt"
    },
    {
      label: "Guidelines",
      url: "https://www.keromakura.net/support/support/guideline.html"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "tags"],

  keywords: [
    "まずらぼ"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/78f4764e7aa299a700767d51f0d064c3/raw/dmca_20220921.txt"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode"],

  keywords: [
    "tydi"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/495e1f664f94d7f204fdd94d1cd8cb55/raw"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "株式会社葉月",
    "オーガスト",
    "あいりすミスティリア！",
    "千の刃濤、桃花染の皇姫",
    "大図書館の羊飼い",
    "穢翼のユースティア",
    "fortune arterial",
    "夜明け前より瑠璃色な",
    "月は東に日は西に",
    "princess holiday",
    "バイナリィ・ポット"
  ],

  title: "Past DMCA / music usage restriction",

  messageJa:
    "過去にDMCA申立てがあり、ガイドラインにより楽曲の使用は原則禁止されています。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to past DMCA notices, and music usage is generally prohibited by the guidelines. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice 1",
      url: "https://gist.githubusercontent.com/peppy/e0e8a7a9c92abaa21615eb5ca63746e6/raw/917d7f4c6a92390fb2feb86c894df366c1aadf56/DMCA_Hazuki_Asphodelus.txt"
    },
    {
      label: "DMCA notice 2",
      url: "https://gist.githubusercontent.com/peppy/3005a6911c6c49b48f059b577e430046/raw"
    },
    {
      label: "DMCA notice 3",
      url: "https://gist.githubusercontent.com/peppy/94239ad1225812e0e40e4d51ec564bd1/raw"
    },
    {
      label: "DMCA notice 4",
      url: "https://gist.githubusercontent.com/peppy/4f44ac2336f4ee18ffb967055ce490c4/raw"
    },
    {
      label: "Guidelines",
      url: "https://august-soft.com/about/fanfic_guideline"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "とある",
    "涼宮ハルヒの憂鬱",
    "艦隊これくしょん"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice",
      url: "https://gist.githubusercontent.com/peppy/eef03a270bcb776f7a5503b8217dfcc6/raw"
    }
  ]
},
];

function normalizeContentPermissionText(text) {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function runContentPermissionCheck(text, fileName) {
  const artistLine = findMetadataLine(text, "Artist");
  const artistUnicodeLine = findMetadataLine(text, "ArtistUnicode");

  const titleLine = findMetadataLine(text, "Title");
  const titleUnicodeLine = findMetadataLine(text, "TitleUnicode");

  const sourceLine = findMetadataLine(text, "Source");
  const tagsLine = findMetadataLine(text, "Tags");

  const artist =
    normalizeContentPermissionText(
      artistLine?.value ?? ""
    );

  const artistUnicode =
    normalizeContentPermissionText(
      artistUnicodeLine?.value ?? ""
    );

  const title =
    normalizeContentPermissionText(
      titleLine?.value ?? ""
    );

  const titleUnicode =
    normalizeContentPermissionText(
      titleUnicodeLine?.value ?? ""
    );

  const source =
    normalizeContentPermissionText(
      sourceLine?.value ?? ""
    );

  const tags =
    normalizeContentPermissionText(
      tagsLine?.value ?? ""
    );

  const results = [];

  for (const rule of CONTENT_PERMISSION_RULES) {
    const matchedFields = [];

    for (const field of rule.fields) {
      const targetText =
        field === "artist"
          ? artist
          : field === "artistUnicode"
            ? artistUnicode
            : field === "title"
              ? title
              : field === "titleUnicode"
                ? titleUnicode
                : field === "source"
                  ? source
                  : field === "tags"
                    ? tags
                    : "";

      const matchedKeywords = rule.keywords.filter(keyword =>
        targetText.includes(normalizeContentPermissionText(keyword))
      );

      if (matchedKeywords.length) {
        matchedFields.push({
          field,
          keywords: matchedKeywords
        });
      }
    }

    if (!matchedFields.length) continue;

    results.push({
      category: rule.category,
      level: rule.level,
      title: rule.title,
      messageJa: rule.messageJa,
      messageEn: rule.messageEn,
      link: rule.link,
      links: rule.links ?? [],
      matchedFields,
      matchedKeywords: matchedFields.flatMap(item => item.keywords)
    });
  }

  return {
    fileName,
    results
  };
}