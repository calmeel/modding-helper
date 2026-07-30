/** その他：てんかん警告 */
function formatMultipleEpilepsyWarningResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatSortedResults(results, formatEpilepsyWarningResult, t);
}

function formatEpilepsyWarningResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  const flashIssues = result.flashIssues ?? [];
  const bpmIssues = result.bpmIssues ?? [];

  if (!flashIssues.length && !bpmIssues.length) {
    lines.push(t("noEpilepsyWarningIssues"));
    return lines.join("\n");
  }

  lines.push(
    `<span class="note-subtext">` +
    `${t("epilepsyWarningNotice")}` +
    `</span>`
  );

  if (flashIssues.length) {
    lines.push(t("epilepsyKiaiFlashIssues"));
    lines.push("");

    for (const item of flashIssues) {
      const cls = item.level === "warn" ? "result-warn" : "ok";
      const hzText = item.hz.toFixed(2);
      const intervalText = `${Math.round(item.intervalMs)} ms`;

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(item.prevTime)} -> ${formatTimestampLink(item.time)} | ` +
        `${hzText} Hz | ${intervalText}` +
        `</span>`
      );
    }

    lines.push("");
  }

  if (bpmIssues.length) {
    lines.push(t("epilepsyHighBpmKiaiIssues"));
    lines.push("");

    for (const item of bpmIssues) {
      const cls = item.level === "warn" ? "result-warn" : "ok";
      const bpmText = item.bpm.toFixed(3);
      const hzText = item.hz.toFixed(2);

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)} | ` +
        `${bpmText} BPM | ${hzText} Hz` +
        `</span>`
      );
    }
  }

  return lines.join("\n").trimEnd();
}
