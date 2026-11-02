const { SKILLS } = require("../utils/skillsList");

// ---------- Skills ----------
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches a skill only as a whole word, so "Java" is NOT found inside "JavaScript"
// and "SQL" is NOT found inside "MySQL".
const MATCHERS = SKILLS.map(([name, ...aliases]) => ({
  name,
  regex: new RegExp(
    `(?<![A-Za-z0-9+#.])(?:${aliases.map(escapeRegex).join("|")})(?![A-Za-z0-9+#])`,
    "i",
  ),
}));

function extractSkills(text) {
  return MATCHERS.filter((matcher) => matcher.regex.test(text)).map(
    (matcher) => matcher.name,
  );
}

// ---------- Email ----------
function extractEmail(text) {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0].toLowerCase().slice(0, 254) : "";
}

// ---------- Name (a best guess, used for display only, never for ranking) ----------
const NOT_A_NAME =
  /\b(resume|curriculum|vitae|cv|profile|summary|objective|contact|email|phone|address|linkedin|github|portfolio|skills|education|experience|projects|engineer|developer|designer|analyst|manager|intern|student|consultant|architect|scientist|fresher|full stack|fullstack)\b/i;

function extractName(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8); // a name is almost always in the first few lines

  for (const line of lines) {
    if (line.length < 3 || line.length > 40) continue;
    if (/[\d@:/\\|]/.test(line)) continue; // contact lines have digits, @, | and so on
    if (NOT_A_NAME.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!words.every((word) => /^[A-Za-z][A-Za-z.'’-]*$/.test(word))) continue;

    // "PRIYA SHARMA" -> "Priya Sharma"
    return line === line.toUpperCase()
      ? line.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
      : line;
  }
  return "";
}

// If no name is found, show the file name so the recruiter can still tell resumes apart
function nameFromFile(originalName) {
  return originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

// ---------- Sections (Experience, Education, Skills) ----------
const HEADINGS = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "internship",
    "internships",
  ],
  education: [
    "education",
    "academic background",
    "academic qualifications",
    "qualifications",
  ],
  skills: [
    "skills",
    "technical skills",
    "key skills",
    "core competencies",
    "technologies",
  ],
  other: [
    "projects",
    "academic projects",
    "personal projects",
    "certifications",
    "achievements",
    "awards",
    "summary",
    "professional summary",
    "objective",
    "career objective",
    "profile",
    "interests",
    "hobbies",
    "languages",
    "references",
    "publications",
    "extracurricular activities",
  ],
};

function detectHeading(line) {
  if (!line || line.length > 40) return null;
  const cleaned = line
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const [key, names] of Object.entries(HEADINGS)) {
    if (names.includes(cleaned)) return key;
  }
  return null;
}

// Splits the resume into { experience: "...", education: "...", skills: "..." }
function splitSections(text) {
  const parts = {};
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const heading = detectHeading(line);

    if (heading) {
      current = heading === "other" ? null : heading;
      continue;
    }
    if (current) {
      parts[current] = (parts[current] || "") + line + "\n";
    }
  }
  return parts;
}

// ---------- Experience ----------
// 1) What the candidate states: "3 years of experience", "experience of 2 years"
const STATED_PATTERNS = [
  /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[A-Za-z]+){0,3}?\s+experience/gi,
  /experience\s*(?:of|:)?\s*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)/gi,
];

function statedYears(text) {
  let best = 0;
  for (const pattern of STATED_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1]);
      if (value <= 50 && value > best) best = value;
    }
  }
  return best;
}

// 2) Date ranges inside the Experience section: "Jan 2023 - Dec 2024", "2019 - Present"
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const YEAR = "((?:19|20)\\d{2})";
const RANGE_PATTERN = new RegExp(
  `(?:${MONTH}[\\s,]+)?${YEAR}\\s*(?:-|–|—|to)\\s*(?:(?:${MONTH}[\\s,]+)?${YEAR}|(present|current|now|till date|ongoing))`,
  "gi",
);
const MONTH_NUMBERS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// A date as "number of months since year 0". Missing month = mid-year, so errors cancel out.
function monthIndex(year, monthName) {
  const month = monthName
    ? MONTH_NUMBERS[monthName.toLowerCase().slice(0, 3)]
    : 6;
  return Number(year) * 12 + month;
}

function yearsFromDates(section) {
  if (!section) return 0;

  const now = new Date();
  const nowIndex = now.getFullYear() * 12 + (now.getMonth() + 1);
  const ranges = [];

  for (const m of section.matchAll(RANGE_PATTERN)) {
    // m[1]=start month, m[2]=start year, m[3]=end month, m[4]=end year, m[5]="present"
    const start = monthIndex(m[2], m[1]);
    const end = m[5] ? nowIndex : monthIndex(m[4], m[3]);
    if (end < start || end - start > 50 * 12 || start > nowIndex) continue;
    ranges.push([start, Math.min(end, nowIndex)]);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  // Merge overlapping ranges so two jobs held at the same time are not counted twice
  let months = 0;
  let current = null;
  for (const [start, end] of ranges) {
    if (current && start <= current[1]) {
      current[1] = Math.max(current[1], end);
    } else {
      if (current) months += current[1] - current[0] + 1;
      current = [start, end];
    }
  }
  if (current) months += current[1] - current[0] + 1;

  return Math.round((months / 12) * 2) / 2; // nearest half year
}

// Only the Experience section is used for dates, otherwise a degree like
// "B.Tech 2018 - 2022" would be counted as work experience.
function estimateExperience(text, experienceSection) {
  return Math.min(
    50,
    Math.max(statedYears(text), yearsFromDates(experienceSection)),
  );
}

// ---------- Education ----------
const DEGREE_PATTERN =
  /\b(bachelor|master|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|bca|mca|mba|ph\.?\s?d|diploma)/i;
const DEGREE_PATTERN_UPPER = /\b(B\.E\.?|M\.E\.?|BE|ME)\b/; // case-sensitive, so "be" the word is ignored

function extractEducation(section) {
  const found = [];
  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.length > 150) continue;
    if (DEGREE_PATTERN.test(line) || DEGREE_PATTERN_UPPER.test(line))
      found.push(line);
    if (found.length === 4) break;
  }
  return found;
}

// ---------- Main function ----------
function extractInfo(text, originalName = "") {
  const sections = splitSections(text);

  return {
    candidateName: extractName(text) || nameFromFile(originalName),
    email: extractEmail(text),
    skills: extractSkills(text),
    experienceYears: estimateExperience(text, sections.experience || ""),
    education: extractEducation(sections.education || ""),
  };
}

module.exports = { extractInfo };
