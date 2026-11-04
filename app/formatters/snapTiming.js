// Plain translated text; callers escape it when inserting into HTML.
function formatSnapCompatibility(item, t) {
  const key = {
    stableOnly: "timingStableOnly",
    lazerOnly: "timingLazerOnly",
    stableWheelOnly: "timingStableWheelOnly",
    lazerWheelOnly: "timingLazerWheelOnly"
  }[item.compatibility];
  return key ? t(key).replace("{diff}", `${item.diff > 0 ? "+" : ""}${item.diff} ms`) : "";
}

function formatSnapSupplemental(item, t) {
  const matches = (item.supplementalSnaps ?? []).map(match =>
    t(match.diff === 0 ? "offsetSupplementalExact" : "offsetSupplementalNear")
      .replace("{snap}", `1/${match.snap}`)
      .replace("{diff}", `${match.diff > 0 ? "+" : ""}${match.diff} ms`)
  );
  return matches.length
    ? t("offsetSupplementalNote").replace("{matches}", matches.join(", "))
    : "";
}
