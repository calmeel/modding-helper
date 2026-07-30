/** Kiai Compare系の表示関数 */
function formatKiaiCompareResult(results, t) {
  const lines = [];

  if (!results.length) {
    return t("noOsuFiles");
  }

  lines.push(t("kiaiTotalDuration"));
  lines.push("");

  results = sortResultsForDisplay(results);

  const diffNames = results.map(result => getDifficultyNameText(result.fileName));
  const diffWidth = Math.max(
    10,
    ...diffNames.map(name => name.length)
  );

  for (const result of results) {
    const plainName = getDifficultyNameText(result.fileName);
    const coloredName = getDifficultyName(result.fileName);
    const padding = " ".repeat(diffWidth - plainName.length);

    lines.push(
      `  ${coloredName}${padding} | ${formatDuration(result.totalDuration)}`
    );

    if (result.hasImplicitKiaiEnd) {
      lines.push(`  ${" ".repeat(diffWidth)} | ${t("warningImplicitKiaiEnd")}`);
    }
  }

  lines.push("");

  if (results.length < 2) {
    lines.push(t("kiaiMismatchSections"));
    lines.push(`  ${t("needTwoDiffs")}`);
    return lines.join("\n");
  }

  const compared = compareKiaiResults(results);

  lines.push(t("kiaiMismatchSections"));
  lines.push("");

  if (!compared.mismatchSections.length) {
    lines.push(`  ${t("noKiaiMismatch")}`);
    return lines.join("\n");
  }

  lines.push(formatKiaiMismatchTable(compared.mismatchSections, results, t));
  return lines.join("\n").trimEnd();
}

function formatKiaiMismatchTable(sections, results, t) {
  const sortedResults = sortResultsForDisplay(results);

  const diffHeaders = sortedResults.map(result => ({
    plain: getDifficultyNameText(result.fileName),
    html: getDifficultyName(result.fileName)
  }));

  const rows = sections.map(section => {
    const values = sortedResults.map(result => {
      const state = section.states.find(s => s.fileName === result.fileName);
      const plain = state?.kiai ? "ON" : "OFF";

      return {
        plain: state?.kiai ? "ON" : "- ",
        html: state?.kiai
          ? "ON"
          : "- "
      };
    });

    const timeText =
      `${formatTimestampLink(section.start)} - ${formatTimestampLink(section.end)}`;

    const plainTimeText =
      `${msToTimestamp(section.start)} - ${msToTimestamp(section.end)}`;

    return {
      timeText,
      plainTimeText,
      values
    };
  });

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...rows.map(row => visibleWidth(row.plainTimeText))
  );

  const colWidths = diffHeaders.map((header, index) => {
    let maxWidth = visibleWidth(header.plain);

    for (const row of rows) {
      maxWidth = Math.max(maxWidth, visibleWidth(row.values[index].plain));
    }

    return Math.max(maxWidth, 3);
  });

  const lines = [];

  lines.push(
    `${padEndVisual("Time", timeWidth)} | ` +
    diffHeaders.map((header, index) => {
      const padding = " ".repeat(colWidths[index] - visibleWidth(header.plain));
      return header.html + padding;
    }).join(" | ")
  );

  lines.push(
    `${"-".repeat(timeWidth)}-+-` +
    colWidths.map(width => "-".repeat(width)).join("-+-")
  );

  for (const row of rows) {
    const timePadding =
      " ".repeat(timeWidth - visibleWidth(row.plainTimeText));

    lines.push(
      `${row.timeText}${timePadding} | ` +
      row.values.map((value, index) => {
        const padding = " ".repeat(colWidths[index] - visibleWidth(value.plain));
        return value.html + padding;
      }).join(" | ")
    );
  }

  return lines.join("\n");
}
