const CONTENT_PERMISSION_RULES = [
  {
    category: "personalBan",
    level: "warn",
    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],
    keywords: ["RouteSeven"],
    title: "Music usage restriction",
    messageJa: "osu! における楽曲使用を禁止しています。使用前に確認してください。",
    messageEn: "This artist prohibits the use of their music in osu!. Please check before use.",
    links: [{
      label: "Music usage terms",
      labelJa: "楽曲利用規約",
      url: "https://z-siecle.net/about.html"
    }]
  },
  {
    category: "pastDmca",
    level: "warn",
    fields: ["title", "titleUnicode"],
    keywords: ["鏡の世界には私しかいない"],
    title: "Past DMCA notice",
    messageJa: "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    messageEn: "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    links: [
      {
        label: "osu! beatmap",
        labelJa: "osu! ビートマップ",
        url: "https://osu.ppy.sh/beatmapsets/685725#osu/1478540"
      }
    ]
  },
  {
    category: "pastDmca",
    level: "warn",
    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],
    keywords: ["Alon Mor"],
    title: "Past DMCA notice",
    messageJa: "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    messageEn: "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    links: [
      {
        label: "DMCA notice",
        labelJa: "DMCA通知",
        url: "https://gist.githubusercontent.com/peppy/3cc5a15a3be9f2a01336ae93322033f0/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2026)",
        "labelJa": "DMCA通知（2026年）",
        "url": "https://gist.githubusercontent.com/peppy/84f4cf009fe88a9d61b13b58dc53dea8/raw/dmca_20260922.txt"
      }
    ],
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "EZ2ON"
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。\n備考：SHIKI - AIR は削除対象ではありませんでした。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.\nNote: SHIKI - AIR was not subject to removal.",
    "links": [
      {
        "label": "DMCA notice (2026)",
        "labelJa": "DMCA通知（2026年）",
        "url": "https://gist.githubusercontent.com/peppy/84f4cf009fe88a9d61b13b58dc53dea8/raw/dmca_20260922.txt"
      }
    ],
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "AIR (EZ2ON Ver.)",
      "Holic",
      "LIMBO",
      "Le grand Bleu",
      "Minus 2",
      "The back of Beyond",
      "The Prince of Darkness",
      "Energy Flower 3007",
      "G.O.A",
      "Fallen Angel",
      "Zeroize",
      "開花"
    ]
  },
  {
    category: "pastDmca",
    level: "warn",
    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],
    keywords: ["אייל גולן"],
    title: "Past DMCA notice",
    messageJa: "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    messageEn: "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    links: [
      {
        label: "DMCA notice (2015)",
        labelJa: "DMCA通知（2015年）",
        url: "https://web.archive.org/web/20250820195303/https://gist.githubusercontent.com/peppy/884920598cbc3b9e4b08/raw/2b8ed13ac10c2111862b8bd547d6e892f4d78960/dmca_2015-06-14_eyal.txt"
      }
    ]
  },
  {
    category: "pastDmca",
    level: "warn",
    fields: ["title", "titleUnicode"],
    keywords: ["赤い約束"],
    title: "Past DMCA notice",
    messageJa: "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    messageEn: "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    links: [
      {
        label: "DMCA notice (2015)",
        labelJa: "DMCA通知（2015年）",
        url: "https://gist.githubusercontent.com/peppy/6ce590aee2b91bb630f4c25ab85d0aa7/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "Clover Day’s"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2015)",
        "labelJa": "DMCA通知（2015年）",
        "url": "https://gist.githubusercontent.com/peppy/74435fabd5b8b0da3eff947e2fa69cf2/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Clover Day’s"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。但し、Short Ver. の利用は黙認されています。",
    "messageEn": "This content has been subject to past DMCA notices. However, use of the Short Ver. is tacitly permitted.",
    "links": [
      {
        "label": "DMCA notice (2014)",
        "labelJa": "DMCA通知（2014年）",
        "url": "https://web.archive.org/web/20230805004109/https://gist.githubusercontent.com/peppy/d98148dbb5bcec4d2d9e/raw/c47c04d3afd4d79644d471f086735d9d0b86b0e7/gistfile1.txt"
      },
      {
        "label": "DMCA notice (2015)",
        "labelJa": "DMCA通知（2015年）",
        "url": "https://gist.githubusercontent.com/peppy/74435fabd5b8b0da3eff947e2fa69cf2/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "しあわせがたり"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2015)",
        "labelJa": "DMCA通知（2015年）",
        "url": "https://gist.githubusercontent.com/peppy/74435fabd5b8b0da3eff947e2fa69cf2/raw"
      }
    ]
  },
  {
    category: "pastDmca",
    level: "warn",
    fields: ["title", "titleUnicode"],
    keywords: ["Palette"],
    keywordArtists: {
      "Palette": ["常闇トワ"]
    },
    title: "Past DMCA notice",
    messageJa: "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    messageEn: "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    links: [
      {
        label: "DMCA notice (2021)",
        labelJa: "DMCA通知（2021年）",
        url: "https://gist.githubusercontent.com/peppy/129db574a72b4510eba096049835d6c5/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "乙女とふれあう、ひとつ屋根の下"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/75eafd6c36dc1805381ca295f11208d9/raw/dmca_2023-03-03.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Can't stop love"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/75eafd6c36dc1805381ca295f11208d9/raw/dmca_2023-03-03.txt"
      }
    ]
  },
  {
    category: "personalBan",
    level: "warn",
    fields: ["source", "tags"],
    keywords: ["ウィルプラス", "WillPlus"],
    title: "Music redistribution restriction",
    messageJa:
      "ゲームで使用している音楽の転載・配布は全面的に禁止されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",
    messageEn:
      "Reposting or distributing music used in the games is entirely prohibited. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",
    links: [{
      label: "Guidelines",
      labelJa: "ガイドライン",
      url: "https://www.will-japan.co.jp/guidelines/"
    }]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "響け！ユーフォニアム３",
      "響け！ユーフォニアム3"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/4bbf655b3badfba15392c272bb472af4/raw/dmca_20240622.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "ReCoda"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/4bbf655b3badfba15392c272bb472af4/raw/dmca_20240622.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "君のことが大大大大大好きな100人の彼女"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/f6f1f818fe455f0ce948fe13aac0014b/raw/dmca_20240717.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "大大大大大好きな君へ♡"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/f6f1f818fe455f0ce948fe13aac0014b/raw/dmca_20240717.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "ましろ色シンフォニー",
      "ましろ色シンフォニー SANA EDITION"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/8b003a4537f5bd20d515eb1d02205a84/raw/dmca_20240822.txt"
      },
      {
        "label": "DMCA notice (2026)",
        "labelJa": "DMCA通知（2026年）",
        "url": "https://gist.githubusercontent.com/peppy/99eaa61fb80115b0b18d92db9d2d2d17/raw/gistfile1.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "雪は何色"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/8b003a4537f5bd20d515eb1d02205a84/raw/dmca_20240822.txt"
      },
      {
        "label": "DMCA notice (2026)",
        "labelJa": "DMCA通知（2026年）",
        "url": "https://gist.githubusercontent.com/peppy/99eaa61fb80115b0b18d92db9d2d2d17/raw/gistfile1.txt"
      }
    ]
  },
  {
    category: "personalBan",
    level: "warn",
    fields: ["source", "tags"],
    keywords: [
      "クリアレーヴ",
      "Clearave",
      "ぱれっと",
      "キャラメリア",
      "スミレ",
      "ぱれっとクオリア",
      "SWEET&TEA",
      "バグシステム",
      "Lamia",
      "娘娘",
      "Recette",
      "Lovelet"
    ],
    title: "Music usage restriction",
    messageJa:
      "楽曲の転用、ウェブ上での公開を許諾なしに行うことは禁止されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",
    messageEn:
      "Repurposing the music or publishing it on the web without permission is prohibited. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",
    links: [{
      label: "Guidelines",
      url: "https://www.clearrave.co.jp/contact/"
    }]
  },
  {
    category: "disallowedArtist",
    level: "error",

    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

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
    keywordMatchModes: { NOMA: "word" },

    title: "Disallowed artists",

    messageJa:
      "osu!official 上で使用が許可されていないアーティストです。",

    messageEn:
      "These artists are disallowed by osu!official.",

    link: "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
  },
  {
    category: "disallowedArtist",
    level: "error",

    fields: ["title", "titleUnicode"],
    keywords: ["青春のアーカイブ"],
    title: "Disallowed artists",
    messageJa: "40mPが作詞・作曲・編曲しているため使用できません。",
    messageEn: "This song cannot be used because 40mP wrote the lyrics, composed, and arranged it.",
    links: [{
      label: "osu! discussion",
      url: "https://osu.ppy.sh/beatmapsets/2163686/discussion/-/generalAll#/4302139"
    }]
  },
  {
    category: "disallowedArtist",
    level: "error",
    fields: ["title", "titleUnicode"],
    keywords: ["The Glorious Octagon of Destiny", "8 Awesome Angles of YouTube"],
    title: "Disallowed artists",
    messageJa: "NOMA が作曲しているため使用できません。",
    messageEn: "This song cannot be used because it was composed by NOMA.",
    links: [{
      label: "osu! discussion",
      url: "https://osu.ppy.sh/beatmapsets/2556596/discussion/-/generalAll#/5860913"
    }]
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
      "osu!official 上で使用が許可されていないレーベルです。",

    messageEn:
      "These labels are disallowed by osu!official.",

    link: "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
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
      "osu!official 上で条件付きで使用が許可されているレーベルです。使用条件を確認してください。",

    messageEn:
      "These labels are allowed by osu!official, with exceptions. Please verify the usage conditions.",

    link: "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
  },
  {
    category: "conditionalLabel",
    level: "warn",

    fields: ["tags"],

    keywords: [
      "Rave Taisen Compilation Album",
      "レイヴ大戦コンピレーション",
      "Ultra Hitech",
      "BASS AVENGERS",
      "FÜGENE",
      "SPD GAR",
      "epoqc",
      "Evangelix",
      "Re:BIBLE",
      "ネオンストライド",
      "encore -Emotional Vocal Pop"
    ],

    title: "Conditional label permissions",

    messageJa:
      "MEGAREX のアルバムです。osu!official 上で条件付きで使用が許可されているレーベルです。使用条件を確認してください。",

    messageEn:
      "This is a MEGAREX album. MEGAREX is a label allowed by osu!official, with exceptions. Please verify the usage conditions.",

    link: "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
  },
  {
    category: "conditionalLabel",
    level: "warn",

    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

    keywords: [
      "DJ Poyoshi",
      "DJPoyoshi",
      "DJ勝也",
      "lapix",
      "HiTECH NINJA",
      "PSYQUI",
      "Blacklolita",
      "YUKIYANAGI"
    ],
    keywordMatchModes: { lapix: "word" },

    title: "Conditional label permissions",

    messageJa:
      "MEGAREX 所属のアーティストです。osu!official 上で条件付きで使用が許可されているレーベルです。使用条件を確認してください。",

    messageEn:
      "This artist is affiliated with MEGAREX, a label allowed by osu!official, with exceptions. Please verify the usage conditions.",

    link: "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
  },
  {
    category: "conditionalLabel",
    level: "warn",

    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

    keywords: [
      "Mameyudoufu",
      "rejection"
    ],

    title: "Conditional label permissions",

    messageJa:
      "MEGAREX 所属のアーティストです。osu!official 上で条件付きで使用が許可されているレーベルです。使用条件を確認してください。",

    messageEn:
      "This artist is affiliated with MEGAREX, a label allowed by osu!official, with exceptions. Please verify the usage conditions.",

    link: "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
  },
  {
    category: "conditionalArtist",
    level: "warn",

    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

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
    keywordMatchModes: { "ak+q": "word", Frums: "word", Zekk: "word" },

    title: "Conditional artist permissions",

    messageJa:
      "osu!official 上で条件付きで使用が許可されているアーティストです。使用条件を確認してください。",

    messageEn:
      "These artists are allowed by osu!official, with exceptions. Please verify the usage conditions.",

    link:
      "https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions"
  },
    {
    category: "personalBan",
    level: "warn",
    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],
    keywords: ["ゆこぴ", "yukopi"],
    title: "Custom map redistribution restriction",
    messageJa:
      "このアーティストは楽曲の再配布を伴うカスタムマップの作製を許可していません。当該ポストを確認してください。",
    messageEn:
      "This artist does not permit the creation of custom maps involving redistribution of their music. Please check the linked post.",
    links: [{
      label: "osu! discussion",
      url: "https://osu.ppy.sh/beatmapsets/1979883/discussion/-/generalAll#/3752514"
    }]
  },
  {
    category: "personalBan",
    level: "warn",
    fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],
    keywords: ["Avans"],
    matchMode: "word",
    title: "Music usage not agreed",
    messageJa:
      "このアーティストはosu! への楽曲利用に同意していません。当該ポストを確認してください。",
    messageEn:
      "This artist has not agreed to the use of their music in osu!. Please check the linked post.",
    links: [{
      label: "osu! discussion",
      url: "https://osu.ppy.sh/beatmapsets/2297629/discussion/-/generalAll#/5628154"
    }]
  },
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

  keywords: [
    "ぱらどっと",
    "para dot."
  ],

  title: "Personal upload ban",

  messageJa:
    "このアーティストは osu! への楽曲アップロードを禁止しています。当該ポストを確認してください。",

  messageEn:
    "This artist prohibits uploads of their music to osu!. Please check the linked post.",

  link:
    "https://x.com/zenerat/status/1621121410361065472"
},
{
  category: "permissionRequired",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

  keywords: [
    "smilybruh"
  ],

  title: "Permission required",

  messageJa:
    "楽曲の再アップロードには許可が必要です。確認してください。",

  messageEn:
    "Permission is required to reupload the music. Please check before use.",

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
    "Arcaeaアプリ内または公式サウンドトラックに含まれる音楽を用いた、音楽ゲームにおける二次創作を禁止しています。ガイドラインを確認してください。",

  messageEn:
    "Derivative works in rhythm games using music included in the Arcaea app or official soundtracks are prohibited. Please check the guidelines.",

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

  fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

  keywords: [
    "slave.v-v-r"
  ],

  title: "Personal upload restriction",

  messageJa:
    "ゲーム（非商用含む）における曲の使用は全面的に禁止です。ガイドラインを確認してください。",

  messageEn:
    "All use of the music in games, including non-commercial games, is prohibited. Please check the guidelines.",

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
    "本作品の楽曲をそのまま二次創作物の素材として使用・転載・再公開することは禁止されています。ガイドラインを確認してください。",

  messageEn:
    "Using, reposting, or republishing music from this work as-is as material for derivative works is prohibited. Please check the guidelines.",

  link:
    "https://manosaba.com/guidelines"
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

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
      label: "DMCA notice (2013)",
      labelJa: "DMCA通知（2013年）",
      url: "https://gist.githubusercontent.com/peppy/65634825af9a9f237407/raw"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

  keywords: [
    "cosmograph",
    "lunatic sounds",
    "Lunatic Sound",
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
    "beatmania"
  ],

  removedSongsPage: "dmca/dmcaBeatmania.html",
  removedSongsPageEn: "dmca/dmcaBeatmania.en.html",

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice (2014)",
      labelJa: "DMCA通知（2014年）",
      url: "https://gist.githubusercontent.com/peppy/15bd77feb938322e05e6ef18a99b1572/raw"
    }
  ]
},
{
  category: "pastDmca",
  level: "warn",

  fields: ["artist", "artistUnicode"],
  matchMode: "word",

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
      label: "DMCA notice (2022)",
      labelJa: "DMCA通知（2022年）",
      url: "https://gist.githubusercontent.com/peppy/418364abd1b74b95150b87b7c831001a/raw/dmca_20221208.txt"
    }
  ]
},
{
  category: "pastDmca",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "アイドルマスター ミリオンライブ！"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice (2022)",
      labelJa: "DMCA通知（2022年）",
      url: "https://gist.githubusercontent.com/peppy/6b91dea9835cd49ddee13794f6deeb5a/raw/dmca_20221005.txt"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "title", "titleUnicode", "tags"],

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

  title: "Music usage restriction",

  messageJa:
    "音楽の直接的な引用および転載は禁止されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",

  messageEn:
    "Direct quotation and reproduction of music are prohibited. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",

  links: [
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

  title: "Derivative work restriction",

  messageJa:
    "二次創作は文字または視覚芸術に関するものに限定されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",

  messageEn:
    "Derivative works are limited to literary or visual art. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",

  links: [
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

  title: "Derivative work restriction",

  messageJa:
    "音楽の直接的な引用および転載は禁止されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",

  messageEn:
    "Direct quotation and reproduction of music are prohibited. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",

  links: [
    {
      label: "Guidelines",
      url: "https://www.hook-net.jp/htm/about.htm"
    }
  ]
},
// HOOKSOFT：タイトルによるガイドライン検出を無効化。復活用にルールと曲名を保存。
// {
//   category: "personalBan",
//   level: "warn",
//
//   fields: ["title", "titleUnicode"],
//
//   keywords: [
//     "love loading!!!",
//     "サニスコープ",
//     "カナリーブロッサム",
//     "one two trap!!",
//     "春は詩と共に",
//     "僕らのwatercolor",
//     "ultimate breaKING",
//     "day before memory",
//     "ヒミツプラネット",
//     "それが恋になった日",
//     "ミリオンタイムズ",
//     "love gotcha!",
//     "ブルーカーペット",
//     "きみがいちばんばんばんざ～い!",
//     "cinderella street",
//     "girls’ carnival",
//     "ハレノヒステップ"
//   ],
//
//   title: "Derivative work restriction",
//
//   messageJa:
//     "ガイドラインにより利用が制限されています。使用・アップロード前に権利状況を確認してください。",
//
//   messageEn:
//     "Usage is restricted by the guidelines. Please verify the rights status before use or upload.",
//
//   links: [
//     {
//       label: "Guidelines",
//       url: "https://www.hook-net.jp/htm/about.htm"
//     }
//   ]
// },
{
  category: "personalBan",
  level: "warn",

  fields: ["source", "tags"],

  keywords: [
    "ケロq",
    "KeroQ",
    "枕",
    "モエとら",
    "二重箱",
    "終ノ空",
    "テレビの消えた日",
    "コトバの消えた日",
    "向日葵の教会と長い夏休み",
    "いきなりあなたに恋している",
    "√after and another",
    "しゅぷれ〜むキャンディ"
  ],

  title: "Music usage restriction",

  messageJa:
    "音楽をネットワーク上で不特定多数が閲覧・転送できる状態にする行為は禁止されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",

  messageEn:
    "Making music available for an unspecified number of people to access or transfer over a network is prohibited. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",

  links: [
    {
      label: "Guidelines",
      url: "https://www.keromakura.net/support/support/guideline.html"
    }
  ]
},
// ケロQ / 枕：タイトルによるガイドライン検出を無効化。復活用にルールと曲名を保存。
// {
//   category: "personalBan",
//   level: "warn",
//
//   fields: ["title", "titleUnicode"],
//
//   keywords: [
//     "ナグルファルの船上にて",
//     "登れない坂道",
//     "片翼のイカロス",
//     "カザハネ",
//     "スイッチ・オン♪",
//     "機械人形"
//   ],
//
//   title: "Music usage restriction",
//
//   messageJa:
//     "ガイドラインにより楽曲の使用は原則禁止されています。使用・アップロード前に権利状況を確認してください。",
//
//   messageEn:
//     "Music usage is generally prohibited by the guidelines. Please verify the rights status before use or upload.",
//
//   links: [
//     {
//       label: "Guidelines",
//       url: "https://www.keromakura.net/support/support/guideline.html"
//     }
//   ]
// },
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "tags"],

  keywords: [
    "まずらぼ",
    "muzzle-lab"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice (2022)",
      labelJa: "DMCA通知（2022年）",
      url: "https://gist.githubusercontent.com/peppy/78f4764e7aa299a700767d51f0d064c3/raw/dmca_20220921.txt"
    }
  ]
},
{
  category: "personalBan",
  level: "warn",

  fields: ["artist", "artistUnicode", "tags"],

  keywords: [
    "tydi"
  ],
  matchMode: "word",

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
    "AUGUST",
    // 以下の作品名による検出は無効化。将来の復活用に保存。
//     "あいりすミスティリア！",
//     "千の刃濤、桃花染の皇姫",
//     "大図書館の羊飼い",
//     "穢翼のユースティア",
//     "fortune arterial",
//     "夜明け前より瑠璃色な",
//     "月は東に日は西に",
//     "princess holiday",
//     "バイナリィ・ポット"
  ],

  title: "Music usage restriction",

  messageJa:
    "楽曲そのものを再配布する行為は禁止されています。ガイドラインを確認してください。\nまた、特定楽曲については過去にDMCA削除通知が行われています。\n{contentPermissionListLink}から当該リストを確認できます。",

  messageEn:
    "Redistribution of the music itself is prohibited. Please check the guidelines.\nCertain songs have also been subject to DMCA takedown notices in the past.\nYou can view the list {contentPermissionListLink}.",

  links: [
    {
      label: "Guidelines",
      url: "https://august-soft.com/about/terms_guideline"
    }
  ]
},
{
  category: "pastDmca",
  level: "warn",

  fields: ["title", "titleUnicode"],

  removedSongsPage: "dmca/dmcaRiaj.html",
  removedSongsPageEn: "dmca/dmcaRiaj.en.html",

  keywords: [
    "future gazer",
    "LEVEL5 -judgelight-",
    "memory of snow",
    "only my railgun",
    "way to answer",
    "God knows...",
    "Be Starters!",
    "ライオン",
    "Chase the world",
    "Scarlet Ballet",
    "Black † White",
    "Born to be",
    "magenta",
    "Nevereverland",
    "Now or Never",
    "No pain, No game",
    "エグジスト",
    "SAVIOR OF SONG",
    "にんじゃりばんばん",
    "You & Me",
    "Brand-new World",
    "吹雪",
    "agony",
    "CHA-LA HEAD-CHA-LA",
    "トライアングラー",
    "奇跡の海",
    "Just Awake",
    "Scream Hard as You Can",
    "Rave-up Tonight",
    "君のとなりに",
    "Sparkling Daydream",
    "SAVE MY HEART",
    "境界の彼方",
    "アクアテラリウム",
    "夢色パレード",
    "海色"
  ],

  title: "Past DMCA notice",

  messageJa:
    "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",

  messageEn:
    "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",

  links: [
    {
      label: "DMCA notice (2015)",
      labelJa: "DMCA通知（2015年）",
      url: "https://gist.githubusercontent.com/peppy/eef03a270bcb776f7a5503b8217dfcc6/raw"
    }
  ]
},
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Re:incRnaTiØN ～夕焼ケ世界ノ決別ヲ～",
      "SECRET;WEAPON",
      "saihate",
      "Lilac for Anabel"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2022)",
        "labelJa": "DMCA通知（2022年）",
        "url": "https://gist.githubusercontent.com/peppy/1e3d2e896ef4f8c6386aa7ae1ef6b5c8/raw/dmca_20220517.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "新時代",
      "踊",
      "うっせぇわ",
      "阿修羅ちゃん"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2022)",
        "labelJa": "DMCA通知（2022年）",
        "url": "https://gist.githubusercontent.com/peppy/418364abd1b74b95150b87b7c831001a/raw/dmca_20221208.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "百花は月下に散りぬるを",
      "Brand New Theater!",
      "Flyers!!!",
      "Dreaming!"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2022)",
        "labelJa": "DMCA通知（2022年）",
        "url": "https://gist.githubusercontent.com/peppy/6b91dea9835cd49ddee13794f6deeb5a/raw/dmca_20221005.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "UNION!!"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/ac8678e18b66acec8a9529a0cc6fd44a/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "メイプルストーリー",
      "MapleStory"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/86c30346d749ae39c2ab6bcb4e906442/raw/dmca-20240419.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": ["title", "titleUnicode"],
    "keywords": ["Shine", "Catch Your Dreams!"],
    "keywordArtists": {
      "Shine": ["보라"],
      "Catch Your Dreams!": ["타루"]
    },
    "matchMode": "word",
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2024)",
        "labelJa": "DMCA通知（2024年）",
        "url": "https://gist.githubusercontent.com/peppy/86c30346d749ae39c2ab6bcb4e906442/raw/dmca-20240419.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Asphodelus"
    ],
    "messageJa": "過去にDMCA申立てがあったコンテンツです。但し、Short Ver. の利用は黙認されています。",
    "messageEn": "This content has been subject to past DMCA notices. However, use of the Short Ver. is tacitly permitted.",
    "links": [
      {
        "label": "DMCA notice (2013)",
        "labelJa": "DMCA通知（2013年）",
        "url": "https://gist.githubusercontent.com/peppy/e0e8a7a9c92abaa21615eb5ca63746e6/raw/917d7f4c6a92390fb2feb86c894df366c1aadf56/DMCA_Hazuki_Asphodelus.txt"
      },
      {
        "label": "DMCA notice (2015)",
        "labelJa": "DMCA通知（2015年）",
        "url": "https://gist.githubusercontent.com/peppy/94239ad1225812e0e40e4d51ec564bd1/raw"
      }
    ],
    "title": "Past DMCA notice"
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Stigmata"
    ],
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2016)",
        "labelJa": "DMCA通知（2016年）",
        "url": "https://gist.githubusercontent.com/peppy/4f44ac2336f4ee18ffb967055ce490c4/raw"
      }
    ],
    "title": "Past DMCA notice"
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "親愛なる世界へ",
      "扉ひらいて、ふたり未来へ"
    ],
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2016)",
        "labelJa": "DMCA通知（2016年）",
        "url": "https://gist.githubusercontent.com/peppy/3005a6911c6c49b48f059b577e430046/raw"
      }
    ],
    "title": "Past DMCA notice"
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "SELFISH",
      "Just a fool loves you"
    ],
    "keywordArtists": {
      "SELFISH": ["まずらぼ"],
      "Just a fool loves you": ["C.I.L. Café"]
    },
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2022)",
        "labelJa": "DMCA通知（2022年）",
        "url": "https://gist.githubusercontent.com/peppy/78f4764e7aa299a700767d51f0d064c3/raw/dmca_20220921.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Chase You Down",
      "Tear Me Up"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/495e1f664f94d7f204fdd94d1cd8cb55/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "サクラノ詩",
      "サクラノ刻"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/c67355b9d2e170e98f4681b8112531a4/raw/dmca_20230301-2.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "櫻ノ詩",
      "櫻ト向日葵",
      "刻ト詩"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/c67355b9d2e170e98f4681b8112531a4/raw/dmca_20230301-2.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "素晴らしき日々"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/bdf2cf1647765cf692664871d73d451b/raw/dmca_2023-03-03.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "夜の向日葵",
      "空気力学少女と少年の詩",
      "終末の微笑",
      "音に出来る事"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/bdf2cf1647765cf692664871d73d451b/raw/dmca_2023-03-03.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "アイドルマスター シンデレラガールズ",
      "THE IDOLM@STER"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/b077bcef445c2312b7973c52f67b0ed0/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Star!!",
      "M@GIC☆",
      "お願い！シンデレラ",
      "Shine!!",
      "GO MY WAY!!"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/b077bcef445c2312b7973c52f67b0ed0/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "Entrance",
      "iL",
      "Wings of Piano"
    ],
    "keywordArtists": {
      "Entrance": ["Ice"],
      "iL": ["Ice"],
      "Wings of Piano": ["V.K"]
    },
    "keywordMatchModes": {
      "iL": "word"
    },
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2022)",
        "labelJa": "DMCA通知（2022年）",
        "url": "https://gist.githubusercontent.com/peppy/55e7ee271342766a80f3596d8e5c83fa/raw/dmca_20220328.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "1/2 summer"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/a06d56c0ce15929fb2f8/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "木漏れ日フレネル"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/a06d56c0ce15929fb2f8/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "リアル妹がいる大泉くんのばあい",
      "死神の接吻は別離の味"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/88aa53abb51d2718244f/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "your little sister",
      "Distant Promise"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice",
        "labelJa": "DMCA通知",
        "url": "https://gist.githubusercontent.com/peppy/88aa53abb51d2718244f/raw"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "source",
      "tags"
    ],
    "keywords": [
      "オレンジポケット",
      "OrangePocket",
      "LikeLife",
      "_summer",
      "HoneyComing",
      "FairlyLife",
      "さくらビットマップ",
      "SuGirly Wish",
      "ストロベリーノーツ",
      "Strawberry Nauts",
      "LOVELY QUEST",
      "PriministAr",
      "MeltyMoment",
      "トラベリングスターズ",
      "Amenity's Life",
      "よりこりまくり。",
      "思い出抱えてアイにコイ!!",
      "ゆびさきコネクション",
      "放課後シンデレラ",
      "ハジラブ -Making*Lovers-",
      "HaremKingdom-ハーレムキングダム-",
      "Sugar*Style",
      "ピュア×コネクト",
      "同棲ラブラブル",
      "ラブラブル～lover able～",
      "めいくるッ！",
      "恋愛０キロメートル",
      "スキとスキとでサンカク恋愛",
      "恋愛、借りちゃいました",
      "フタマタ恋愛",
      "かりぐらし恋愛",
      "恋愛×ロワイアル",
      "アッチむいて恋",
      "IxSHE Tell"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/e34cbd3f9a30cc41b327d4f2555cd29e/raw/dmca_20230306.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "マル秘☆恋愛法則",
      "ふわり恋模様",
      "KIRA＊LIRA",
      "Girls Life",
      "_summer",
      "FairlyLife",
      "恋をしよーよ",
      "恋のレシピ",
      "a little more",
      "Pure Love, True Love",
      "虹色の季節へ",
      "small star",
      "MeltyMoment",
      "Photograph",
      "君と世界と物語",
      "Ever After School",
      "オープニングセレモニー",
      "恋の未来図"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2023)",
        "labelJa": "DMCA通知（2023年）",
        "url": "https://gist.githubusercontent.com/peppy/e34cbd3f9a30cc41b327d4f2555cd29e/raw/dmca_20230306.txt"
      }
    ]
  },
  {
    "category": "pastDmca",
    "level": "warn",
    "fields": [
      "title",
      "titleUnicode"
    ],
    "keywords": [
      "悠久の翼"
    ],
    "title": "Past DMCA notice",
    "messageJa": "過去にDMCA申立てがあったコンテンツです。使用・アップロード前に権利状況を確認してください。",
    "messageEn": "This content has been subject to a past DMCA notice. Please verify the rights status before use or upload.",
    "links": [
      {
        "label": "DMCA notice (2008)",
        "labelJa": "DMCA通知（2008年）",
        "url": "https://osu.ppy.sh/community/forums/topics/10998?n=1"
      }
    ]
  },
  {
    "category": "personalBan",
    "level": "warn",
    "fields": [
      "artist",
      "artistUnicode",
      "title",
      "titleUnicode",
      "tags"
    ],
    "keywords": [
      "雨部冷キザミ"
    ],
    "title": "Map and audio redistribution restriction",
    "messageJa": "このアーティストは osu! における map の配布および音源データの二次配布を禁止しています。ガイドラインを確認してください。",
    "messageEn": "This artist prohibits the distribution of maps and redistribution of audio data in osu!. Please check the guidelines.",
    "links": [
      {
        "label": "Guidelines",
        "labelJa": "ガイドライン",
        "url": "https://note.com/amebre_kizami/n/n6f7be160788a"
      }
    ]
  },
  {
    "category": "personalBan",
    "level": "warn",
    "fields": [
      "artist",
      "artistUnicode",
      "title",
      "titleUnicode",
      "tags"
    ],
    "keywords": [
      "ころんば",
      "Koronba"
    ],
    "title": "Artist credit and music redistribution restrictions",
    "messageJa": "アーティスト名をクレジットすることはタブーとされています。Tags から削除し、アーティスト名には「Unknown Artist」を用いることを検討して下さい。\nまた、「ヤツメ穴」「クロマグロがとんでくる」「イワシがつちからはえてくるんだ」「　.　」の4曲以外は転載が許可されていません。",
    "messageEn": "Crediting the artist by name is considered taboo. Consider removing the name from Tags and using “Unknown Artist” as the artist name.\nReuploads are not permitted except for these four songs: “ヤツメ穴”, “クロマグロがとんでくる”, “イワシがつちからはえてくるんだ”, and “　.　”.",
    "links": [
      {
        "label": "Pixiv Encyclopedia",
        "labelJa": "ピクシブ大百科",
        "url": "https://dic.pixiv.net/a/%E3%81%93%E3%82%8D%E3%82%93%E3%81%B0"
      }
    ]
  },
];
