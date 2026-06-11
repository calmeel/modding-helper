const updateHistoryEntries = [
  {
    date: "2026/05/03",
    type: "preRelease",
    items: { en: [], ja: [] }
  },
  {
    date: "2026/05/03",
    type: "update",
    items: {
      en: [
        "Added the manual.",
        "Added support for hybrid sets.",
        "Added difficulty sorting."
      ],
      ja: [
        "説明書を追加",
        "ハイブリットセットに対応",
        "Difficultyソート機能を追加"
      ]
    }
  },
  {
    date: "2026/05/04",
    type: "update",
    items: {
      en: [
        "Added an option for uncommon snaps (1/5, 1/7, and 1/9).",
        "Added Volume Check and Tag Check."
      ],
      ja: [
        "レアスナップ（1/5, 1/7, and 1/9）オプションを追加",
        "「ボリュームチェック」「Tagチェック」を追加"
      ]
    }
  },
  {
    date: "2026/05/05",
    type: "update",
    items: {
      en: [
        "Added BN evaluation for NAT use.",
        "Added Slider Multiplier / TickRate checks.",
        "Added Tag spelling checks.",
        "Added first-note lag risk detection."
      ],
      ja: [
        "NAT向けの「BN evaluation」機能を追加",
        "「スライダー感度・目盛り」機能を追加",
        "「Tagのスペルチェック」機能を追加",
        "「プチフリのリスク検知」機能を追加"
      ]
    }
  },
  {
    date: "2026/05/06",
    type: "update",
    items: {
      en: [
        "Added Spread Comparison.",
        "Added the Misc tab.",
        "Significantly updated the manual."
      ],
      ja: [
        "「スプレッド比較」機能を追加",
        "「その他」タブを追加",
        "説明書を大幅アップデート"
      ]
    }
  },
  {
    date: "2026/05/08",
    type: "update",
    items: {
      en: [
        "Added the Artist and Title tabs.",
        "Expanded Spread Comparison.",
        "Added flash / epilepsy warning checks.",
        "Added timeline display."
      ],
      ja: [
        "「アーティスト」「タイトル」タブを追加",
        "「スプレッド比較」機能を拡張",
        "「てんかん警告」機能を追加",
        "「タイムライン表示」機能を追加"
      ]
    }
  },
  {
    date: "2026/05/10",
    type: "release",
    items: {
      en: [
        "Added detection for different BG positions between difficulties.",
        "Completed the initial implementation of all features!"
      ],
      ja: [
        "「Diffごとに異なるBG座標」の検出を実装",
        "全ての機能を実装しました！"
      ]
    }
  },
  {
    date: "2026/05/11",
    type: "update",
    items: {
      en: ["Fixed bugs."],
      ja: ["不具合の修正"]
    }
  },
  {
    date: "2026/05/13",
    type: "update",
    items: {
      en: ["Added detection for excessively high scroll speeds."],
      ja: ["「速すぎるスクロール速度の検出」機能を追加"]
    }
  },
  {
    date: "2026/05/20",
    type: "update",
    items: {
      en: [
        "Added several detectable tags.",
        "Added the Content Usage Permissions tab."
      ],
      ja: [
        "検出出来るTagをいくつか追加",
        "「コンテンツ使用許可」タブを追加"
      ]
    }
  },
  {
    date: "2026/05/22",
    type: "update",
    items: {
      en: [
        "Optimized the program and fixed bugs.",
        "Added a warning for PNG background images."
      ],
      ja: [
        "プログラムの最適化・バグ修正",
        "「BGがpng形式である時に警告」機能を追加"
      ]
    }
  },
  {
    date: "2026/05/29",
    type: "update",
    items: {
      en: ["Fixed a slider-end calculation bug."],
      ja: ["スライダー終点計算に関するバグ修正"]
    }
  },
  {
    date: "2026/06/05",
    type: "update",
    items: {
      en: ["Fixed difficulty-name display when the name contains square brackets."],
      ja: ["難易度名に[]が含まれる際の表示を修正"]
    }
  },
  {
    date: "2026/06/12",
    type: "update",
    items: {
      en: [
        "Minor UI adjustments.",
        "Added source code check and tag check items."
      ],
      ja: [
        "UIの微修正",
        "ソースチェック・タグチェックの項目追加"
      ]
    }
  }
];

const updateHistoryTypeLabels = {
  en: {
    preRelease: "Pre-Release",
    release: "Release",
    update: "Update"
  },
  ja: {
    preRelease: "プレリリース",
    release: "リリース",
    update: "更新"
  }
};

function renderUpdateHistory(container, lang) {
  const resolvedLang = lang === "ja" ? "ja" : "en";
  const fragment = document.createDocumentFragment();

  for (const entry of updateHistoryEntries) {
    const heading = document.createElement("h3");
    heading.className = "update-date";
    heading.textContent = `${entry.date} ${updateHistoryTypeLabels[resolvedLang][entry.type]}`;
    fragment.appendChild(heading);

    const items = entry.items[resolvedLang];
    if (items.length === 0) continue;

    const list = document.createElement("ul");
    for (const item of items) {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    }
    fragment.appendChild(list);
  }

  container.replaceChildren(fragment);
}
