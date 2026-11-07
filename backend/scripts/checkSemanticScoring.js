// Checks how the language model's "meaning match" joins the score. It does not need Python or the database.
// Run from the backend folder:  node scripts/checkSemanticScoring.js
const { scoreResume, resolveWeights } = require("../services/scoringService");
const { DEFAULT_WEIGHTS } = require("../config/scoringConfig");
const {
  isCalibrated,
  canScoreWithSemantic,
  filterSemantic,
} = require("../services/semanticService");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
const part = (result, key) => result.breakdown.find((p) => p.key === key);

const job = {
  title: "Backend Developer",
  description:
    "We are looking for a backend developer to build and maintain REST APIs. Bachelor's degree in Computer Science preferred. You will design databases and write clean, tested code.",
  minExperience: 4,
  requiredSkills: ["Node.js", "Express.js", "MongoDB", "Docker"],
  optionalSkills: ["AWS", "Redis"],
};
const resume = {
  experienceYears: 2,
  education: ["B.Tech in Computer Science"],
  extractedText:
    "Backend developer. Built REST APIs with nodejs, Express.js and MongoDB. Deployed on AWS.",
};

const anchors = { low: 0.2, high: 0.6 };
const withSemantic = { ...DEFAULT_WEIGHTS, semantic: 15 };

console.log("The default settings change nothing");
check(
  "the default weight of the meaning match is 0",
  DEFAULT_WEIGHTS.semantic === 0,
);
const plain = scoreResume(job, resume);
check(
  "passing a similarity with the default weight 0 gives the same score",
  scoreResume(job, resume, DEFAULT_WEIGHTS, {
    semanticSimilarity: 0.5,
    anchors,
  }).score === plain.score,
);
check(
  "a weight above 0 but no anchors set: the part is skipped and the score is unchanged",
  scoreResume(job, resume, withSemantic, { semanticSimilarity: 0.5 }).score ===
    plain.score &&
    !part(
      scoreResume(job, resume, withSemantic, { semanticSimilarity: 0.5 }),
      "semantic",
    ),
);

console.log("\nTurning a similarity into points");
const at = (similarity) =>
  part(
    scoreResume(job, resume, withSemantic, {
      semanticSimilarity: similarity,
      anchors,
    }),
    "semantic",
  );
check("the middle of the two anchors = 50 points", at(0.4).score === 50);
check(
  "at or below the low anchor = 0 points",
  at(0.2).score === 0 && at(0.05).score === 0,
);
check(
  "at or above the high anchor = 100 points",
  at(0.6).score === 100 && at(0.95).score === 100,
);
check(
  "the part is labelled for the recruiter",
  at(0.4).label === "Meaning match",
);
check(
  "high not above low -> the part is skipped",
  !part(
    scoreResume(job, resume, withSemantic, {
      semanticSimilarity: 0.5,
      anchors: { low: 0.5, high: 0.5 },
    }),
    "semantic",
  ),
);
check(
  "no similarity for this resume -> the part is skipped",
  !part(scoreResume(job, resume, withSemantic, { anchors }), "semantic"),
);

console.log("\nWeights stay fair");
const full = scoreResume(job, resume, withSemantic, {
  semanticSimilarity: 0.4,
  anchors,
});
check(
  "effective weights still add up to 100",
  near(
    full.breakdown.reduce((t, p) => t + p.weight, 0),
    100,
    0.3,
  ),
);
check(
  "the meaning match gets 15 of 115 = about 13%",
  near(part(full, "semantic").weight, 13, 0.2),
);
const total = full.breakdown.reduce(
  (t, p) => t + (p.score * p.weight) / 100,
  0,
);
check(
  "overall score equals the weighted total of the breakdown",
  near(total, full.score, 1.5),
);

const high = scoreResume(job, resume, withSemantic, {
  semanticSimilarity: 0.6,
  anchors,
});
const low = scoreResume(job, resume, withSemantic, {
  semanticSimilarity: 0.2,
  anchors,
});
check(
  "a higher meaning match never gives a lower score",
  high.score >= full.score && full.score >= low.score && high.score > low.score,
);
check(
  "the weight can be sent with a request",
  resolveWeights({ semantic: 15 }).weights.semantic === 15,
);
check(
  "...and set back to 0 for one run",
  resolveWeights({ semantic: 0 }).weights.semantic === 0,
);

console.log("\nAll or nothing for one run");
const ids = ["a", "b", "c"];
const okData = new Map(ids.map((id) => [id, { similarity: 0.4 }]));
const base = {
  weights: withSemantic,
  status: "ok",
  resumeIds: ids,
  byId: okData,
  anchors,
};
check("everything in place -> used", canScoreWithSemantic(base) === true);
check(
  "weight 0 -> not used",
  canScoreWithSemantic({ ...base, weights: DEFAULT_WEIGHTS }) === false,
);
check(
  "anchors not set -> not used",
  canScoreWithSemantic({ ...base, anchors: { low: null, high: null } }) ===
    false,
);
check(
  "service answered only partly -> not used",
  canScoreWithSemantic({ ...base, status: "partial" }) === false,
);
check(
  "service unavailable -> not used",
  canScoreWithSemantic({ ...base, status: "unavailable" }) === false,
);
check(
  "service off -> not used",
  canScoreWithSemantic({ ...base, status: "off" }) === false,
);
const oneMissing = new Map(okData);
oneMissing.delete("b");
check(
  "one resume without data -> not used for anybody",
  canScoreWithSemantic({ ...base, byId: oneMissing }) === false,
);
const oneNull = new Map(okData);
oneNull.set("c", { similarity: null });
check(
  "one resume with similarity null -> not used for anybody",
  canScoreWithSemantic({ ...base, byId: oneNull }) === false,
);
check(
  "isCalibrated: both numbers and high above low",
  isCalibrated({ low: 0.2, high: 0.6 }) &&
    !isCalibrated({ low: 0.6, high: 0.2 }) &&
    !isCalibrated({ low: null, high: 0.6 }),
);

console.log("\nWhich hints are shown");
const semantic = {
  similarity: 0.4,
  model: "m",
  skillHints: [
    { skill: "A", line: "l1", similarity: 0.5, margin: 0.4 },
    { skill: "B", line: "l2", similarity: 0.3, margin: 0.1 },
    { skill: "C", line: "l3", similarity: 0.45, margin: 0.3 },
    { skill: "D", line: "l4", similarity: 0.42, margin: 0.2 },
  ],
};
const open = { hintMinSimilarity: 0, hintMinMargin: 0, hintsPerCandidate: 3 };
check(
  "no cutoffs: the best 3 by margin, strongest first",
  filterSemantic(semantic, open)
    .skillHints.map((h) => h.skill)
    .join("") === "ACD",
);
check(
  "a margin cutoff hides weak hints",
  filterSemantic(semantic, { ...open, hintMinMargin: 0.25 })
    .skillHints.map((h) => h.skill)
    .join("") === "AC",
);
check(
  "a similarity cutoff hides weak hints",
  filterSemantic(semantic, { ...open, hintMinSimilarity: 0.44 })
    .skillHints.map((h) => h.skill)
    .join("") === "AC",
);
check(
  "the overall similarity is kept",
  filterSemantic(semantic, open).similarity === 0.4,
);
check("no language data -> null", filterSemantic(null, open) === null);

console.log(
  failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
);
process.exit(failed > 0 ? 1 : 0);
