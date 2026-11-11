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
    trigger: ["ガルパ", "garupa"],
    suggestGroup: ["バンドリ！", "ガールズバンドパーティ！", "bang", "dream!", "girls", "band", "party", "バンドリ", "bandori", "ガルパ", "garupa"]
  },
  {
    triggerAll: ["バンドリ！", "ガールズバンドパーティ！"],
    suggestGroup: ["バンドリ！", "ガールズバンドパーティ！", "bang", "dream!", "girls", "band", "party", "バンドリ", "bandori", "ガルパ", "garupa"]
  },
  {
    triggerAll: ["bang", "dream!", "girls", "band", "party"],
    suggestGroup: ["バンドリ！", "ガールズバンドパーティ！", "bang", "dream!", "girls", "band", "party", "バンドリ", "bandori", "ガルパ", "garupa"]
  },
  {
    trigger: ["バンドリ！", "バンドリ", "bandori"],
    suggestGroup: ["バンドリ！", "bang", "dream!", "バンドリ", "bandori"]
  },
  {
    triggerAll: ["bang", "dream!"],
    suggestGroup: ["バンドリ！", "bang", "dream!", "バンドリ", "bandori"]
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
    suggestGroup: ["-Blue", "Archive-", "ブルアカ", "buruaka", "blueaka", "yostar", "nexon", "games"]
  },
  {
    triggerAll: ["-Blue", "Archive-"],
    suggestGroup: ["ブルーアーカイブ", "ブルアカ", "buruaka", "blueaka", "yostar", "nexon", "games"]
  },
  {
    trigger: ["ウマ娘", "プリティーダービー", "umamusume"],
    suggestGroup: ["ウマ娘", "プリティーダービー", "umamusume", "uma", "musume", "pretty", "derby", "horse", "girls", "cygames"]
  },
  {
    triggerAll: ["uma", "musume"],
    suggestGroup: ["ウマ娘", "プリティーダービー", "umamusume", "pretty", "derby", "horse", "girls", "cygames"]
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
    source: ["バンドリ！ ガールズバンドパーティ！"],
    tags: ["bang", "dream!", "girls", "band", "party", "バンドリ", "bandori", "ガルパ", "garupa"]
  },
  {
    source: ["ブルーアーカイブ -Blue Archive-"],
    tags: ["ブルアカ", "buruaka", "blueaka", "yostar", "nexon", "games"]
  },
  {
    source: ["ウマ娘 プリティーダービー"],
    tags: ["umamusume", "uma", "musume", "pretty", "derby", "horse", "girls", "cygames"]
  }
];
