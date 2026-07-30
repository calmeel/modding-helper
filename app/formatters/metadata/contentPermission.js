/** コンテンツ使用許可 */
const CONTENT_PERMISSION_CATEGORY_ORDER = [
  "conditionalArtist",
  "disallowedArtist",
  "conditionalLabel",
  "permissionRequired",
  "pastDmca",
  "personalBan"
];

function getContentPermissionCategoryTitle(category, t) {
  const keyMap = {
    conditionalArtist: "contentPermissionConditionalArtists",
    disallowedArtist: "contentPermissionDisallowedArtists",
    conditionalLabel: "contentPermissionConditionalLabels",
    pastDmca: "contentPermissionPastDmca",
    personalBan: "contentPermissionPersonalBans",
    permissionRequired: "contentPermissionPermissionRequired"
  };

  return t(keyMap[category] ?? "contentPermissionOther");
}

function formatMultipleContentPermissionResults(results, t) {
  const matchedResults = results.filter(result =>
    result.results?.length
  );

  if (!matchedResults.length) {
    return escapeHtml(t("noContentPermissionIssues"));
  }

  const rows = [];

  for (const result of matchedResults) {
    for (const item of result.results) {
      rows.push({
        fileName: result.fileName,
        item
      });
    }
  }

  const lines = [];

  for (const category of CONTENT_PERMISSION_CATEGORY_ORDER) {
    const categoryRows = rows.filter(row =>
      row.item.category === category
    );

    if (!categoryRows.length) continue;

    lines.push(formatSectionTitle(
      getContentPermissionCategoryTitle(category, t)
    ));
    lines.push("");

    const groupedRows = groupContentPermissionRows(categoryRows);

    for (const group of groupedRows) {
      const item = group.item;

      const cls =
        item.level === "error"
          ? "result-error"
          : "result-warn";

      lines.push(
        group.fileNames
          .map(fileName => getDifficultyNameText(fileName))
          .join(", ")
      );

      lines.push("");

      const lang = localStorage.getItem("moddingHelperLang") || "ja";

      const message =
        t(item.messageKey) ||
        (lang === "en" ? item.messageEn : item.messageJa) ||
        item.messageJa ||
        item.messageEn ||
        item.title;

      lines.push(
        `<span class="${cls}">` +
        `${escapeHtml(message)}` +
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
          lines.push(
            `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">` +
            `${escapeHtml(link.label)}` +
            `</a>`
          );
        }
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
