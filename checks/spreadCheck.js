function runSpreadCheck(text, fileName) {
  const difficulty = parseSpreadDifficulty(text);

  return {
    fileName,
    od: difficulty.od,
    hp: difficulty.hp,
    sliderMultiplier: difficulty.sliderMultiplier,
    noteCount: countCircleNotes(text),
    density: analyzeSpreadNoteDensity(text),
    restMoments: analyzeSpreadRestMoments(text),
    finishers: collectSpreadFinishers(text),
    scrollSpeed: analyzeSpreadScrollSpeed(text, difficulty),
    sortInfo: getSpreadSortInfo(fileName)
  };
}
