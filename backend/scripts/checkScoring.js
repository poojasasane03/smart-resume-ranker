const {
  scoreResume,
  resolveWeights,
  jobKeywords,
  requiredEducationLevel,
} = require("../services/scoringService");

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

const resumeA = {
  candidateName: "Aman",
  email: "aman@example.com",
  experienceYears: 2,
  education: ["B.Tech in Computer Science, 2018 - 2022"],
  extractedText:
    "Backend developer. Built REST APIs with nodejs, Express.js and MongoDB. Deployed on AWS. Wrote clean code and designed databases.",
};

const resumeB = {
  experienceYears: 6,
  education: ["M.Tech in Computer Science"],
  extractedText:
    "Senior backend developer. Built and maintained REST APIs using Node.js, Express.js, MongoDB and Docker. Deployed on AWS with Redis caching. Designed databases, wrote clean tested code.",
};

const resumeC = {
  experienceYears: 6,
  education: [],
  extractedText: "Graphic designer with Photoshop and Illustrator experience.",
};

console.log("Component scores (Candidate A)");
const a = scoreResume(job, resumeA);
console.log(JSON.stringify(a, null, 2), "\n");

check("required skills: 3 of 4 found = 75", part(a, "required").score === 75);
check("optional skills: 1 of 2 found = 50", part(a, "optional").score === 50);
check("experience: 2 of 4 years = 50", part(a, "experience").score === 50);
check(
  "education: B.Tech meets Bachelor's = 100",
  part(a, "education").score === 100,
);
check("keyword part is present", Boolean(part(a, "keywords")));

console.log("\nSkill matching");
check(
  '"nodejs" in the resume matches the job skill "Node.js"',
  a.matchedSkills.includes("Node.js"),
);
check("Docker is reported as missing", a.missingSkills.includes("Docker"));
check(
  "a missing optional skill is marked",
  a.missingSkills.includes("Redis (optional)"),
);

const javaJob = {
  title: "Dev",
  description: "x".repeat(40),
  minExperience: 0,
  requiredSkills: ["Java"],
  optionalSkills: [],
};
const javaResume = {
  experienceYears: 0,
  education: [],
  extractedText: "Expert in JavaScript and React",
};
const java = scoreResume(javaJob, javaResume);
check(
  '"Java" is NOT found inside "JavaScript"',
  java.matchedSkills.length === 0 && java.missingSkills[0] === "Java",
);

const aliasJob = { ...javaJob, requiredSkills: ["NodeJS"] };
const aliasResume = {
  experienceYears: 0,
  education: [],
  extractedText: "Built APIs with Node.js.",
};
check(
  'job skill "NodeJS" matches "Node.js" in the resume',
  scoreResume(aliasJob, aliasResume).matchedSkills.length === 1,
);

console.log("\nWeights");
const sum = a.breakdown.reduce((total, p) => total + p.weight, 0);
check("effective weights add up to 100", near(sum, 100, 0.2));

const recomputed = a.breakdown.reduce(
  (total, p) => total + (p.score * p.weight) / 100,
  0,
);
check(
  "overall score equals the weighted total of the breakdown",
  near(recomputed, a.score, 1.5),
);

check(
  "parts that do not apply are dropped and the rest get all the weight",
  java.breakdown.length === 1 && java.breakdown[0].weight === 100,
);

const onlyRequired = resolveWeights({
  required: 100,
  optional: 0,
  experience: 0,
  keywords: 0,
  education: 0,
});
check(
  "custom weights work (only required skills = 75)",
  scoreResume(job, resumeA, onlyRequired.weights).score === 75,
);
check(
  "unknown weight name is refused",
  Boolean(resolveWeights({ foo: 1 }).error),
);
check(
  "negative weight is refused",
  Boolean(resolveWeights({ required: -5 }).error),
);
check(
  "all-zero weights are refused",
  Boolean(
    resolveWeights({
      required: 0,
      optional: 0,
      experience: 0,
      keywords: 0,
      education: 0,
    }).error,
  ),
);

console.log("\nExperience and education rules");
const b = scoreResume(job, resumeB);
check(
  "more experience than needed is capped at 100",
  part(b, "experience").score === 100,
);

const mixedJob = {
  ...javaJob,
  description: "Bachelor's or Master's degree in a related field is required.",
};
check(
  "\"Bachelor's or Master's\" asks only for a bachelor (level 2)",
  requiredEducationLevel(mixedJob) === 2,
);

const masterJob = {
  ...javaJob,
  requiredSkills: ["SQL"],
  description: "Master's degree required for this analyst position.",
};
check(
  "a bachelor for a master's job gets half credit",
  part(scoreResume(masterJob, resumeA), "education").score === 50,
);
check(
  "no degree mentioned means the education part is skipped",
  !part(java, "education"),
);

console.log("\nKeywords");
const keywords = jobKeywords(job);
check('keywords include "backend"', keywords.includes("backend"));
check(
  "skill names are not repeated as keywords",
  !["express", "mongodb", "aws", "docker", "redis"].some((w) =>
    keywords.includes(w),
  ),
);
check(
  "filler words are removed",
  !keywords.includes("looking") && !keywords.includes("preferred"),
);
check("at most 15 keywords", keywords.length <= 15);

console.log("\nRanking order and fairness");
const c = scoreResume(job, resumeC);
console.log(`  Scores: A=${a.score}, B=${b.score}, C=${c.score}`);
check(
  "strong candidate B > partial candidate A > unrelated candidate C",
  b.score > a.score && a.score > c.score,
);

const renamed = scoreResume(job, {
  ...resumeA,
  candidateName: "Someone Else",
  email: "other@example.com",
});
check("name and email do not change the score", renamed.score === a.score);

console.log(
  failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
);
process.exit(failed > 0 ? 1 : 0);
