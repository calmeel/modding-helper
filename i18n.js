// i18n.js

const i18n = {
  en: {
    subtitle: "osu!taiko modding support tool",
    selectFile: "Select file",
    selectOsu: "Select .osu / .osz",
    tabClapWhistle: "Clap & Whistle",
    tabOffset: "1ms Offset",
    tabKiaiCompare: "Kiai Compare",
    tabKiaiSnap: "Kiai Snap",
    tabDoubleSv: "Double SV",
    showClap: "Show Clap",
    showWhistle: "Show Whistle",
    tabSettings: "Tab settings",
    tabSvVolume: "SV Volume",
    tabSampleSet: "SampleSet",

    noFileLoaded: "No file loaded.",
    noFileSelected: "No file selected",
    noOsuFiles: "Error: No .osu files were found within the .osz directory.",
    invalidFile: "Error: Please select a .osu or .osz file.",

    file: "File",
    counts: "Counts (Circle only; type=1/5):",
    whistleOnly: "Whistle only",
    clapOnly: "Clap only",
    both: "Both (W+C)",
    none: "None",
    targets: "Targets",

    timestampsBoth: "Timestamps for Both (W+C)",
    timestampsClap: "Timestamps for Clap only",
    timestampsWhistle: "Timestamps for Whistle only",

    includeAdvancedOffsetSnaps: "Include uncommon snaps (1/5, 1/7, 1/9)",
    noOffset: "No 1ms offset snaps found.",
    noDoubleSv: "No double SV found.",
    noKiaiMismatch: "No kiai mismatches found.",
    needTwoDiffs: "Need 2 or more difficulties to compare.",
    kiaiTotalDuration: "Kiai total duration:",
    kiaiMismatchSections: "Kiai mismatch sections:",
    warningImplicitKiaiEnd: "Warning: Kiai end not explicitly defined.",
    noKiaiSnap: "No non-1/1 kiai snap found.",

    detectGapUpTo: "Detect gap up to:",
    includeExactSameSv: "Include exact same-ms overlaps",

    DetectThreshold: "Detect threshold:",
    noSvVolumeIssues: "No suspicious SV volume changes.",
    svVolumeLargeChangeOnly: "Show only volume changes of 15% or more",

    tabVolumeCompare: "Volume Compare",
    volumeCompareThresholdOnly: "Show only differences of 5% or more",
    noVolumeCompareMismatch: "No SV volume mismatches found.",

    tabRedGreenMatch: "Red/Green Match",
    noRedGreenMismatch: "No red/green line mismatches.",
    volumeMismatch: "volume mismatch",
    kiaiMismatch: "kiai mismatch",
    sampleSetMismatch: "sampleset mismatch",

    tabSampleSet: "SampleSet",
    noSampleSetIssues: "No samplesets other than 'Normal' were found.",
    timingPoints: "TimingPoints",
    hitObjects: "HitObjects",

    tabTag: "Tag",
    noTagIssues: "No tag spacing issues found.",
    tagMissing: "Tags line was not found.",
    tagMultipleSpaces: "Multiple half-width spaces",
    tagFullWidthSpace: "Full-width space",
  },

  ja: {
    subtitle: "osu!taiko modding 支援ツール",
    selectFile: "ファイルを選択",
    selectOsu: ".osu / .osz を選択",
    tabClapWhistle: "Clap / Whistle",
    tabOffset: "1msズレ",
    tabKiaiCompare: "Kiai比較",
    tabKiaiSnap: "Kiaiスナップ",
    tabDoubleSv: "二重SV",
    showClap: "Clapを表示",
    showWhistle: "Whistleを表示",
    tabSettings: "タブ設定",
    tabSvVolume: "SVボリューム",
    tabSampleSet: "Sampleset",

    noFileLoaded: "ファイルが読み込まれていません。",
    noFileSelected: "ファイルが選択されていません",
    noOsuFiles: "Error: .osz内に.osuファイルが見つかりません。",
    invalidFile: "Error: .osu または .osz ファイルを選択してください。",

    file: "File",
    counts: "カウント（Circleのみ; type=1/5）:",
    whistleOnly: "Whistle only",
    clapOnly: "Clap only",
    both: "Both (W+C)",
    none: "None",
    targets: "対象数",

    timestampsBoth: "Both (W+C) のタイムスタンプ",
    timestampsClap: "Clapのみ のタイムスタンプ",
    timestampsWhistle: "Whistleのみ のタイムスタンプ",

    includeAdvancedOffsetSnaps: "特殊なsnapも含める（1/5, 1/7, 1/9）",
    noOffset: "1msズレは見つかりませんでした。",
    noDoubleSv: "Double SVは見つかりませんでした。",
    noKiaiMismatch: "Kiaiの不一致は見つかりませんでした。",
    needTwoDiffs: "比較には2つ以上のdiffが必要です。",
    kiaiTotalDuration: "Kiai 総時間：",
    kiaiMismatchSections: "Kiai 不一致区間：",
    warningImplicitKiaiEnd: "Warning: Kiai終了が明示されていません。",
    noKiaiSnap: "1/1以外のKiai snapは見つかりませんでした。",

    detectGapUpTo: "検出する最大間隔：",
    includeExactSameSv: "同じmsの重複も含める",

    DetectThreshold: "検出閾値：",
    noSvVolumeIssues: "問題のあるSV volume変更は見つかりませんでした。",
    svVolumeLargeChangeOnly: "15%以上のvolume変更のみ表示",

    tabVolumeCompare: "ボリューム比較",
    volumeCompareThresholdOnly: "5%以上の差のみ表示",
    noVolumeCompareMismatch: "SV volumeの不一致は見つかりませんでした。",

    tabRedGreenMatch: "赤線&緑線",
    noRedGreenMismatch: "赤線と緑線の不一致は見つかりませんでした。",
    volumeMismatch: "volume不一致",
    kiaiMismatch: "kiai不一致",
    sampleSetMismatch: "sampleset不一致",

    tabSampleSet: "Sampleset",
    noSampleSetIssues: "Normal以外のsamplesetは見つかりませんでした。",
    timingPoints: "TimingPoints",
    hitObjects: "HitObjects",

    tabTag: "Tag",
    noTagIssues: "Tagのスペース問題は見つかりませんでした。",
    tagMissing: "Tags行が見つかりませんでした。",
    tagMultipleSpaces: "2つ以上の半角スペース",
    tagFullWidthSpace: "全角スペース",
  }
};

// グローバルに公開
window.i18n = i18n;