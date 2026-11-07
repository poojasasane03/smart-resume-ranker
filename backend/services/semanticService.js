const { SEMANTIC } = require("../config/scoringConfig");

// True when both anchors are set and make sense (high above low)
function isCalibrated(anchors = SEMANTIC) {
  return (
    typeof anchors.low === "number" &&
    typeof anchors.high === "number" &&
    anchors.high > anchors.low
  );
}

// The meaning match joins the score only when EVERY resume of the run has it.
// Otherwise some candidates would be judged with it and some without, which is unfair.
function canScoreWithSemantic({
  weights,
  status,
  resumeIds,
  byId,
  anchors = SEMANTIC,
}) {
  if (!(weights.semantic > 0) || !isCalibrated(anchors) || status !== "ok")
    return false;

  return resumeIds.every((id) => {
    const data = byId.get(id);
    return data && typeof data.similarity === "number";
  });
}

// Which hints the recruiter sees: only those above the cutoffs, strongest first
function filterSemantic(semantic, settings = SEMANTIC) {
  if (!semantic) return null;

  const skillHints = (semantic.skillHints || [])
    .filter(
      (hint) =>
        hint.similarity >= settings.hintMinSimilarity &&
        hint.margin >= settings.hintMinMargin,
    )
    .sort((a, b) => b.margin - a.margin)
    .slice(0, settings.hintsPerCandidate);

  return { similarity: semantic.similarity, model: semantic.model, skillHints };
}

module.exports = { isCalibrated, canScoreWithSemantic, filterSemantic };
