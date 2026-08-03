/** Barline系の表示関数 */
function formatMultipleBarlineResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatBarlineResultGroup(sortResultsForDisplay(results), t);
}

function formatBarlineResultGroup(results, t) {
  const lines = [];

  lines.push(formatSectionTitle(t("barlineDoubleBarline")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineDoubleBarlineLines(result, t));
    lines.push("");
  }

  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("barlineNegativeStartBug")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineNegativeStartWarningLines(result, t));
    lines.push("");
  }

  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("barlineNoteBarlineSeparation")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineNoteBarlineSeparationLines(result, t));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatBarlineDoubleBarlineLines(result, t) {
  if (!result.doubleBarlines.length) {
    return [t("barlineNoDoubleBarline")];
  }

  return result.doubleBarlines.map(item => {
    const isBothClients =
      item.clients?.includes("stable") &&
      item.clients?.includes("lazer");
    const isSameTime =
      Math.abs(item.redLineTime - item.barlineTime) <=
      BARLINE_ISSUE_TIME_EPSILON;
    const count = Math.max(
      2,
      ...Object.values(item.clientCounts ?? {})
    );
    const message = isSameTime
      ? t("barlineSameTimeMultiple")
          .replace("{count}", String(count))
      : t("barlineCloseMultiple")
          .replace(
            "{gap}",
            formatBarlinePreciseNumber(
              Math.abs(item.redLineTime - item.barlineTime)
            )
          );
    const timestamps = isSameTime
      ? formatBarlineTimestampLink(item.barlineTime)
      : `${formatBarlineTimestampLink(item.barlineTime)} -> ` +
        `${formatBarlineTimestampLink(item.redLineTime)}`;
    const classAttribute = isBothClients
      ? ` class="result-error"`
      : "";

    return (
      `<span${classAttribute}>` +
      `${formatBarlineClientScope(item, t)}${timestamps} | ` +
      `${escapeHtml(message)}` +
      `</span>`
    );
  });
}

function formatBarlineNegativeStartWarningLines(result, t) {
  if (!result.negativeStartBarlineWarnings?.length) {
    return [t("barlineNoNegativeStartBug")];
  }

  return result.negativeStartBarlineWarnings.map(item =>
    `<span class="result-warn">` +
    `${formatBarlineClientScope(item, t)}` +
    `${formatBarlineTimestampLink(item.nextRedLineTime)} | ` +
    `${escapeHtml(t(item.stableLazerMessageKey))}` +
    `</span>`
  );
}

function formatBarlineNoteBarlineSeparationLines(result, t) {
  const items = [
    ...(result.detachedBarlines ?? []),
    ...(result.intentionalDetachedBarlines ?? [])
  ].sort((a, b) =>
    a.barlineTime - b.barlineTime ||
    a.noteTime - b.noteTime
  );

  if (!items.length) {
    return [t("barlineNoNoteBarlineSeparation")];
  }

  return items.map(item =>
    formatBarlineDetachedBarlineLine(item, t)
  );
}

function formatBarlineDetachedBarlineLine(item, t) {
  const deltaSign = item.delta > 0 ? "+" : "";
  const objectLabel = item.objectType === "slider"
    ? t("offsetObjectSlider")
    : item.objectType === "spinner"
      ? t("offsetObjectSpinner")
      : t("barlineNote");
  return (
    `<span class="result-warn">` +
    `${formatBarlineClientScope(item, t)}` +
    `${formatBarlineTimestampLink(item.barlineTime)} ` +
    `${escapeHtml(t("barlineGeneratedBarline"))}: ${formatBarlineSpeed(item.barlineSpeed)} px/s | ` +
    `${formatTimestampLink(item.noteTime)} ` +
    `${escapeHtml(objectLabel)}: ${formatBarlineSpeed(item.noteSpeed)} px/s | ` +
    `${escapeHtml(t("barlineDelta"))}: ${deltaSign}${formatBarlineSpeed(item.delta)} px/s` +
    `</span>`
  );
}

function formatBarlineSpeed(value) {
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 100) / 100).toString();
}

function formatBarlineClientScope(item, t) {
  const clients = item?.clients ?? [];
  if (!clients.length) return "";

  const labels = clients.map(client =>
    client === "stable" ? "osu!stable" : "osu!lazer"
  );

  if (labels.length === 1) {
    const onlyLabel = t("barlineClientOnly")
      .replace("{client}", labels[0]);
    return `[${onlyLabel}] `;
  }

  return `[${labels.join(", ")}] `;
}

function formatBarlineTimestampLink(time) {
  if (!Number.isFinite(time)) return "N/A";

  const integerTime = Math.trunc(time);
  const link = formatTimestampLink(integerTime);
  const fraction = time - integerTime;

  if (Math.abs(fraction) <= BARLINE_ISSUE_TIME_EPSILON) {
    return link;
  }

  const sign = fraction > 0 ? "+" : "";
  return `${link} (${sign}${formatBarlinePreciseNumber(fraction)} ms)`;
}

function formatBarlinePreciseNumber(value) {
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 1000) / 1000).toString();
}
