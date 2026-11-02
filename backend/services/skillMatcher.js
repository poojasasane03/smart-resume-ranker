const { SKILLS } = require("../utils/skillsList");

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Every known spelling -> the whole group, e.g. "nodejs" -> ["node.js", "nodejs"]
const ALIASES = new Map();
for (const [name, ...aliases] of SKILLS) {
  const group = [...new Set([name.toLowerCase(), ...aliases])];
  for (const spelling of group) {
    ALIASES.set(spelling, group);
  }
}

const cache = new Map();

// Builds a regex that finds the skill as a whole word (any known spelling)
function buildMatcher(skill) {
  const key = skill.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const spellings = ALIASES.get(key) || [key];
  const pattern = spellings
    .map((spelling) => escapeRegex(spelling).replace(/\s+/g, "\\s+")) // "data structures" also matches across a line break
    .join("|");

  // "Java" must not match inside "JavaScript", and "SQL" must not match inside "MySQL"
  const regex = new RegExp(
    `(?<![A-Za-z0-9+#.])(?:${pattern})(?![A-Za-z0-9+#])`,
    "i",
  );
  cache.set(key, regex);
  return regex;
}

// Splits a list of skills into the ones found in the text and the ones not found
function findSkills(skills, text) {
  const matched = [];
  const missing = [];
  for (const skill of skills) {
    (buildMatcher(skill).test(text) ? matched : missing).push(skill);
  }
  return { matched, missing };
}

module.exports = { findSkills };
