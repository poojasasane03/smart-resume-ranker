// Every number that controls the ranking lives in this one file.

// How much each part counts. Only the proportions matter, because the
// weights of the parts that apply to a job are rescaled to add up to 100.
const DEFAULT_WEIGHTS = {
  required: 50, // required skills
  optional: 15, // optional skills
  experience: 20, // years of experience compared with the job's minimum
  keywords: 10, // important words from the job description
  education: 5, // degree level, only if the job description mentions one
  semantic: 0, // meaning match from the language model. 0 = off until you calibrate it (see SEMANTIC below)
};

const COMPONENT_LABELS = {
  required: "Required skills",
  optional: "Optional skills",
  experience: "Experience",
  keywords: "Job description keywords",
  education: "Education",
  semantic: "Meaning match",
};

// Score bands used for the "Strong / Possible / Weak match" labels
const FIT_BANDS = { strong: 75, possible: 50 };

const KEYWORD_LIMIT = 15; // how many top words of the job description we look for
const MIN_KEYWORDS = 3; // with fewer words than this, the keyword part is skipped
const ALGORITHM_VERSION = "1.0"; // change this when the formula changes

// Settings for the language model (the Python NLP service).
// Fill the two anchors in by calibrating with real resumes: node scripts/semanticReport.js JOB_ID
const SEMANTIC = {
  low: null, // similarity of a candidate you judge clearly irrelevant: worth 0 points
  high: null, // similarity of a candidate you judge clearly strong: worth 100 points
  hintMinSimilarity: 0, // hints below this similarity are hidden
  hintMinMargin: 0, // hints below this margin are hidden
  hintsPerCandidate: 3, // at most this many hints are shown for one candidate
};

module.exports = {
  DEFAULT_WEIGHTS,
  COMPONENT_LABELS,
  FIT_BANDS,
  KEYWORD_LIMIT,
  MIN_KEYWORDS,
  ALGORITHM_VERSION,
  SEMANTIC,
};
