/** コンテンツ使用許可 */
const CONTENT_PERMISSION_SECTIONS = [
  "contentPermissionOfficial",
  "contentPermissionGuidelines",
  "contentPermissionPastDmca"
];

function getContentPermissionSection(item) {
  // Some older DMCA rules still use the personalBan category.
  if (item.category === "pastDmca" || item.title === "Past DMCA notice") {
    return "contentPermissionPastDmca";
  }
  if (["conditionalArtist", "disallowedArtist", "conditionalLabel"].includes(item.category)) {
    return "contentPermissionOfficial";
  }
  return "contentPermissionGuidelines";
}

function getContentPermissionOfficialOrder(item) {
  if (item.category === "disallowedArtist") {
    return item.title === "Disallowed labels" ? 1 : 0;
  }
  return item.category === "conditionalArtist" ? 2 : 3;
}

function formatMultipleContentPermissionResults(results, t) {
  if (!results.length) {
    return escapeHtml(t("noOsuFiles"));
  }

  const matchedResults = sortResultsForDisplay(results).filter(result =>
    result.results?.length
  );

  const rows = [];

  for (const result of matchedResults) {
    for (const item of result.results) {
      rows.push({
        fileName: result.fileName,
        item
      });
    }
  }

  const lang = localStorage.getItem("moddingHelperLang") || "ja";
  const docsBase = typeof window !== "undefined" && window.electronAPI
    ? "https://calmeel.github.io/modding-helper/docs/"
    : "docs/";
  const listPage = lang === "en" ? "contentPermissionList.en.html" : "contentPermissionList.html";
  const listLink = `<a href="${escapeHtml(docsBase + listPage)}" target="_blank" rel="noopener noreferrer">` +
    `${escapeHtml(t("contentPermissionCheckListLinkText"))}</a>`;
  const lines = [
    escapeHtml(t("contentPermissionCheckListLink")).replace("{link}", () => listLink),
    "",
    formatSeparator()
  ];

  for (const section of CONTENT_PERMISSION_SECTIONS) {
    const categoryRows = rows.filter(row =>
      getContentPermissionSection(row.item) === section
    );
    if (section === "contentPermissionOfficial") {
      categoryRows.sort((a, b) =>
        getContentPermissionOfficialOrder(a.item) - getContentPermissionOfficialOrder(b.item)
      );
    }

    lines.push(formatSectionTitle(
      t(section)
    ));
    lines.push("");

    if (!categoryRows.length) {
      lines.push(escapeHtml(t("noContentPermissionIssues")));
      lines.push("");
      lines.push(formatSeparator());
      continue;
    }

    const groupedRows = groupContentPermissionRows(categoryRows);

    for (const group of groupedRows) {
      const item = group.item;

      const cls =
        item.level === "error"
          ? "result-error"
          : "result-warn";

      lines.push(
        group.fileNames
          .map(fileName => escapeHtml(getDifficultyNameText(fileName)))
          .join(", ")
      );

      lines.push("");

      const message =
        t(item.messageKey) ||
        (lang === "en" ? item.messageEn : item.messageJa) ||
        item.messageJa ||
        item.messageEn ||
        item.title;

      lines.push(
        `<span class="${cls}">` +
        escapeHtml(message).replace("{contentPermissionListLink}", () => listLink) +
        `</span>`
      );

      if (item.matchedFields?.length) {
        lines.push("");

        for (const matched of item.matchedFields) {
          lines.push(
            `${escapeHtml(t("matchedField"))}: ` +
            `<code>${escapeHtml(matched.field)}</code> | ` +
            `${escapeHtml(t("matchedKeywords"))}: ` +
            matched.keywords
              .map(keyword => `<code>${escapeHtml(keyword)}</code>`)
              .join(" ")
          );
        }
      }

      const links = item.links?.length
        ? item.links
        : item.link
          ? [{ label: "Reference", url: item.link }]
          : [];

      if (links.length) {
        lines.push("");

        for (const link of links) {
          const url = link.url.replace(
            /^https:\/\/osu\.ppy\.sh\/wiki\/(?:en|ja)\/Rules\/Content_usage_permissions(?=[#?]|$)/,
            `https://osu.ppy.sh/wiki/${lang === "en" ? "en" : "ja"}/Rules/Content_usage_permissions`
          );
          lines.push(
            `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">` +
            `${escapeHtml(lang === "en" ? link.label : (link.labelJa ?? link.label))}` +
            `</a>`
          );
        }
      }

      if (item.removedSongsPage) {
        if (!links.length) lines.push("");
        const page = lang === "en" ? (item.removedSongsPageEn ?? item.removedSongsPage) : item.removedSongsPage;
        lines.push(
          `<a href="${escapeHtml(docsBase + page)}" target="_blank" rel="noopener noreferrer">` +
          `${lang === "en" ? "List of removed songs" : "削除された楽曲のリスト"}</a>`
        );
      }

      lines.push("");
    }

    lines.push(formatSeparator());
  }

  return lines.join("\n").trimEnd();
}

function groupContentPermissionRows(rows) {
  const map = new Map();

  for (const row of rows) {
    const item = row.item;

    const matchedKey = (item.matchedFields ?? [])
      .map(field =>
        `${field.field}:${[...(field.keywords ?? [])].sort().join(",")}`
      )
      .sort()
      .join("|");

      const linkKey = item.links?.length
        ? item.links.map(link => `${link.label}:${link.url}`).join("|")
        : item.link || "";

      const key = [
        item.category,
        item.level,
        item.title,
        item.messageJa,
        item.messageEn,
        item.removedSongsPage,
        item.removedSongsPageEn,
        linkKey,
        matchedKey
      ].join("::");

    if (!map.has(key)) {
      map.set(key, {
        item,
        fileNames: []
      });
    }

    map.get(key).fileNames.push(row.fileName);
  }

  return [...map.values()];
}
