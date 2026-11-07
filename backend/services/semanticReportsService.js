// Builds a plain-text report that compares the exact score with the language data of one job.
// It only formats data. It does not touch the database, so it is easy to test.

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

// 1 = best (highest value). Equal values share the average rank.
function ranksHighToLow(values) {
  const order = values
    .map((value, index) => [value, index])
    .sort((a, b) => b[0] - a[0]);
  const ranks = new Array(values.length);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1][0] === order[start][0])
      end++;
    const rank = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) ranks[order[k][1]] = rank;
    start = end + 1;
  }
  return ranks;
}

function pearson(a, b) {
  const n = a.length;
  const meanA = a.reduce((sum, v) => sum + v, 0) / n;
  const meanB = b.reduce((sum, v) => sum + v, 0) / n;
  let top = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    top += (a[i] - meanA) * (b[i] - meanB);
    varA += (a[i] - meanA) ** 2;
    varB += (b[i] - meanB) ** 2;
  }
  if (varA === 0 || varB === 0) return null; // one of the lists never changes
  return top / Math.sqrt(varA * varB);
}

// How similar are two orderings? +1 = same order, 0 = unrelated, -1 = opposite
function spearman(a, b) {
  if (a.length < 3) return null;
  return pearson(ranksHighToLow(a), ranksHighToLow(b));
}

const fmt = (value, digits = 2) =>
  typeof value === "number" ? value.toFixed(digits) : "-";
const rankText = (rank) =>
  Number.isInteger(rank) ? String(rank) : rank.toFixed(1);
const shorten = (text, max) =>
  text.length > max ? `${text.slice(0, max - 3)}...` : text;

function summary(values) {
  if (values.length === 0) return "no data";
  return `min ${fmt(Math.min(...values))}, median ${fmt(median(values))}, max ${fmt(Math.max(...values))}`;
}

// rows: [{ score, semantic: { similarity, model, skillHints }, resume: { candidateName } }], best exact score first
function buildReport(
  jobTitle,
  rows,
  { showNames = false, showLines = true } = {},
) {
  const out = [];
  const label = (row, index) =>
    `#${index + 1}${showNames && row.resume ? ` ${row.resume.candidateName}` : ""}`;
  const withData = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) => row.semantic && typeof row.semantic.similarity === "number",
    );

  out.push(`Job: ${jobTitle}`);
  out.push(
    `Candidates: ${rows.length}   With language data: ${withData.length}`,
  );
  if (showNames === false)
    out.push(
      "Names are hidden. Candidates are numbered by exact score (#1 = highest).",
    );

  if (withData.length === 0) {
    out.push(
      "",
      "No language data yet. Start the Python service and run the ranking again.",
    );
    return out.join("\n");
  }

  // ----- 1. Exact score against semantic similarity -----
  const exact = withData.map(({ row }) => row.score);
  const semantic = withData.map(({ row }) => row.semantic.similarity);
  const exactRanks = ranksHighToLow(exact);
  const semanticRanks = ranksHighToLow(semantic);

  out.push("", "1) Exact score and semantic similarity");
  out.push(
    "   Candidate".padEnd(26) +
      "Exact".padEnd(8) +
      "Semantic".padEnd(10) +
      "Exact rank".padEnd(12) +
      "Semantic rank",
  );
  withData.forEach(({ row, index }, i) => {
    out.push(
      `   ${label(row, index)}`.padEnd(26) +
        String(row.score).padEnd(8) +
        fmt(row.semantic.similarity).padEnd(10) +
        rankText(exactRanks[i]).padEnd(12) +
        rankText(semanticRanks[i]),
    );
  });

  const correlation = spearman(exact, semantic);
  out.push("");
  out.push(
    correlation === null
      ? "   Order agreement (Spearman): not enough data (needs 3 or more candidates that differ)"
      : `   Order agreement (Spearman): ${fmt(correlation)}   (1 = same order, 0 = unrelated, n = ${withData.length})`,
  );
  out.push(`   Semantic similarity: ${summary(semantic)}`);

  // ----- 2. Hints -----
  out.push(
    "",
    "2) Hints: the closest line for skills that exact matching missed",
  );
  const allHints = [];
  let counter = 0;
  withData.forEach(({ row, index }) => {
    for (const hint of row.semantic.skillHints || []) {
      counter++;
      allHints.push(hint);
      const line = showLines ? `  "${shorten(hint.line, 80)}"` : "";
      out.push(
        `   H${counter}`.padEnd(7) +
          `${label(row, index)}`.padEnd(8) +
          shorten(hint.skill, 22).padEnd(24) +
          `sim ${fmt(hint.similarity)}  margin ${fmt(hint.margin)}${line}`,
      );
    }
  });

  if (allHints.length === 0) {
    out.push("   No hints (every skill was found by exact matching).");
  } else {
    out.push("");
    out.push(
      `   Similarity of all hints: ${summary(allHints.map((h) => h.similarity))}`,
    );
    out.push(
      `   Margin of all hints:     ${summary(allHints.map((h) => h.margin))}`,
    );
    out.push(
      "",
      "   Now judge each hint yourself: does the line really show the skill?",
    );
    out.push("   Reply like:  right: H1 H3 H4   wrong: H2 H5");
  }

  return out.join("\n");
}

module.exports = { buildReport, spearman, ranksHighToLow, median };
