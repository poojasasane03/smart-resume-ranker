const {
  DEFAULT_WEIGHTS,
  COMPONENT_LABELS,
  KEYWORD_LIMIT,
  MIN_KEYWORDS,
  ALGORITHM_VERSION,
} = require("../config/scoringConfig");
const { findSkills } = require("./skillMatcher");

const COMPONENT_KEYS = Object.keys(DEFAULT_WEIGHTS);

// ---------- Weights ----------
// Merges the weights sent with a request into the defaults and checks them.
// Returns { weights } or { error }.
function resolveWeights(overrides) {
  if (overrides === undefined || overrides === null) {
    return { weights: { ...DEFAULT_WEIGHTS } };
  }
  if (typeof overrides !== "object" || Array.isArray(overrides)) {
    return {
      error: 'Weights must be an object, for example { "required": 60 }.',
    };
  }

  const weights = { ...DEFAULT_WEIGHTS };
  for (const [key, value] of Object.entries(overrides)) {
    if (!COMPONENT_KEYS.includes(key)) {
      return {
        error: `Unknown weight "${key}". Allowed: ${COMPONENT_KEYS.join(", ")}.`,
      };
    }
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    ) {
      return { error: `Weight "${key}" must be a number between 0 and 100.` };
    }
    weights[key] = value;
  }

  if (COMPONENT_KEYS.every((key) => weights[key] === 0)) {
    return { error: "At least one weight must be above 0." };
  }
  return { weights };
}

// ---------- Skills (required and optional) ----------
function scoreSkillList(list, text) {
  if (!list || list.length === 0)
    return { applicable: false, matched: [], missing: [] };

  const { matched, missing } = findSkills(list, text);
  return {
    applicable: true,
    score: (matched.length / list.length) * 100,
    matched,
    missing,
  };
}

// ---------- Experience ----------
function scoreExperience(job, resume) {
  const needed = job.minExperience || 0;
  if (needed <= 0) return { applicable: false };

  const have = resume.experienceYears || 0;
  // More experience than needed does not raise the score above 100
  return { applicable: true, score: Math.min(1, have / needed) * 100 };
}

// ---------- Education ----------
// Level 1 diploma, 2 bachelor, 3 master, 4 doctorate
const LEVEL_PATTERNS = [
  [4, [/\b(?:ph\.?\s?d|doctorate)\b/i]],
  [
    3,
    [
      /\b(?:master(?:'s|’s|s)|master of|m\.?\s?tech|m\.?\s?sc|mca|mba|post[\s-]?graduate)\b/i,
      /(?<![A-Za-z])(?:M\.E\.?|ME)(?![A-Za-z])/, // case-sensitive, so the word "me" is ignored
    ],
  ],
  [
    2,
    [
      /\b(?:bachelor(?:'s|’s|s)?|b\.?\s?tech|b\.?\s?sc|bca)\b/i,
      /(?<![A-Za-z])(?:B\.E\.?|BE)(?![A-Za-z])/, // case-sensitive, so the word "be" is ignored
    ],
  ],
  [1, [/\bdiploma\b/i]],
];

function detectLevels(text) {
  return LEVEL_PATTERNS.filter(([, patterns]) =>
    patterns.some((p) => p.test(text)),
  ).map(([level]) => level);
}

// What the job asks for. If it says "Bachelor's or Master's", the LOWEST level is enough.
// 0 means the job does not mention education at all.
function requiredEducationLevel(job) {
  const text = `${job.title}\n${job.description}`;
  const levels = detectLevels(text);
  if (levels.length > 0) return Math.min(...levels);
  return /\bdegree\b/i.test(text) ? 2 : 0; // "a degree" with no level means bachelor
}

function scoreEducation(job, resume) {
  const required = requiredEducationLevel(job);
  if (required === 0) return { applicable: false };

  const levels = detectLevels((resume.education || []).join("\n"));
  const have = levels.length > 0 ? Math.max(...levels) : 0; // the candidate's HIGHEST level

  let score = 0;
  if (have >= required) score = 100;
  else if (have > 0 && have === required - 1) score = 50;

  return { applicable: true, score };
}

// ---------- Keywords from the job description ----------
const STOPWORD_LIST =
  `a about above across after again all also am an and any are as at be because been before
being below between both but by can could did do does doing down during each either else etc few for from further
had has have having he her here hers him his how i if in including include into is it its just like looking may me
might more most must my need needs new no nor not now of off on once only or other our ours out over own per plus
preferred required requirements requirement responsible responsibilities role same seeking she should so some such
than that the their theirs them then there these they this those through to too under until up us use used using
very via was we well were what when where which while who whom why will with within without would you your yours
ability able strong good excellent experience experienced years year team work working candidate candidates job
position company join knowledge skills skill understanding ensure support help`.split(
    /\s+/,
  );

// Light plural handling so "APIs" and "API" count as the same word
function stem(word) {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;
}

const STOPWORDS = new Set(STOPWORD_LIST.map(stem));

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#]*/g) || []).map(stem);
}

// The most repeated meaningful words of the job (title + description).
// Words that are already skills are left out, so nothing is counted twice.
function jobKeywords(job) {
  const skillWords = new Set(
    tokenize(
      [...(job.requiredSkills || []), ...(job.optionalSkills || [])].join(" "),
    ),
  );

  const counts = new Map();
  for (const word of tokenize(`${job.title} ${job.description}`)) {
    if (word.length < 3 || STOPWORDS.has(word) || skillWords.has(word))
      continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  // Sort is stable, so words with the same count keep the order they first appeared in
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, KEYWORD_LIMIT)
    .map(([word]) => word);
}

function scoreKeywords(job, text) {
  const keywords = jobKeywords(job);
  if (keywords.length < MIN_KEYWORDS) return { applicable: false };

  const resumeWords = new Set(tokenize(text));
  const found = keywords.filter((word) => resumeWords.has(word));
  return { applicable: true, score: (found.length / keywords.length) * 100 };
}

// ---------- Putting it all together ----------
// job: { title, description, minExperience, requiredSkills, optionalSkills }
// resume: { extractedText, experienceYears, education }
function scoreResume(job, resume, weights = DEFAULT_WEIGHTS) {
  const text = resume.extractedText || "";

  const parts = {
    required: scoreSkillList(job.requiredSkills, text),
    optional: scoreSkillList(job.optionalSkills, text),
    experience: scoreExperience(job, resume),
    keywords: scoreKeywords(job, text),
    education: scoreEducation(job, resume),
  };

  // Only parts that apply to this job (and have a weight) take part
  const active = COMPONENT_KEYS.filter(
    (key) => parts[key].applicable && weights[key] > 0,
  );
  const totalWeight = active.reduce((sum, key) => sum + weights[key], 0);

  if (totalWeight === 0) {
    const error = new Error(
      "The chosen weights do not apply to this job. Give a weight to at least one part this job uses, for example required skills.",
    );
    error.statusCode = 400;
    throw error;
  }

  let overall = 0;
  const breakdown = active.map((key) => {
    const effectiveWeight = (weights[key] / totalWeight) * 100;
    overall += (parts[key].score * effectiveWeight) / 100;
    return {
      key,
      label: COMPONENT_LABELS[key],
      score: Math.round(parts[key].score),
      weight: Math.round(effectiveWeight * 10) / 10,
    };
  });

  return {
    score: Math.min(100, Math.max(0, Math.round(overall))),
    matchedSkills: [...parts.required.matched, ...parts.optional.matched],
    missingSkills: [
      ...parts.required.missing,
      ...parts.optional.missing.map((skill) => `${skill} (optional)`),
    ],
    exactMissing: [...parts.required.missing, ...parts.optional.missing],
    breakdown,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

module.exports = {
  scoreResume,
  resolveWeights,
  jobKeywords,
  requiredEducationLevel,
};
