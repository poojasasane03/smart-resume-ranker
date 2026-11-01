const MAX_SKILLS = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// ["Node.js", " node.js ", "", 5] -> ["Node.js"]
function cleanSkills(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const skills = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const skill = item.trim();
    const key = skill.toLowerCase();
    if (skill && skill.length <= 40 && !seen.has(key)) {
      seen.add(key);
      skills.push(skill);
    }
  }
  return skills.slice(0, MAX_SKILLS);
}

// ---------- Jobs ----------
function validateJobInput(body = {}) {
  const data = {
    title: cleanText(body.title),
    company: cleanText(body.company),
    location: cleanText(body.location),
    minExperience: Number(body.minExperience ?? 0),
    requiredSkills: cleanSkills(body.requiredSkills),
    optionalSkills: cleanSkills(body.optionalSkills),
    description: cleanText(body.description),
  };

  if (data.title.length < 3 || data.title.length > 100) {
    return { error: "Job title must be between 3 and 100 characters." };
  }
  if (data.company.length < 2 || data.company.length > 100) {
    return { error: "Company name must be between 2 and 100 characters." };
  }
  if (data.location.length > 100) {
    return { error: "Location must be at most 100 characters." };
  }
  if (
    Number.isNaN(data.minExperience) ||
    data.minExperience < 0 ||
    data.minExperience > 50
  ) {
    return { error: "Minimum experience must be a number between 0 and 50." };
  }
  if (data.requiredSkills.length === 0) {
    return { error: "Add at least one required skill." };
  }

  const requiredKeys = data.requiredSkills.map((s) => s.toLowerCase());
  const overlap = data.optionalSkills.find((s) =>
    requiredKeys.includes(s.toLowerCase()),
  );
  if (overlap) {
    return { error: `"${overlap}" is in both required and optional skills.` };
  }

  if (data.description.length < 30 || data.description.length > 5000) {
    return { error: "Job description must be between 30 and 5000 characters." };
  }

  return { data };
}

// ---------- Auth ----------
function validateRegisterInput(body = {}) {
  const data = {
    name: cleanText(body.name),
    company: cleanText(body.company),
    email: cleanText(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
  };

  if (data.name.length < 2 || data.name.length > 100) {
    return { error: "Name must be between 2 and 100 characters." };
  }
  if (data.company.length < 2 || data.company.length > 100) {
    return { error: "Company name must be between 2 and 100 characters." };
  }
  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) {
    return { error: "Please enter a valid email address." };
  }
  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  // bcrypt only uses the first 72 bytes, so we refuse longer passwords
  if (Buffer.byteLength(data.password) > 72) {
    return { error: "Password is too long (maximum 72 characters)." };
  }
  if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    return {
      error: "Password must contain at least one letter and one number.",
    };
  }

  return { data };
}

function validateLoginInput(body = {}) {
  const data = {
    email: cleanText(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
  };

  if (!data.email || !data.password) {
    return { error: "Please enter your email and password." };
  }
  return { data };
}

module.exports = {
  validateJobInput,
  validateRegisterInput,
  validateLoginInput,
};
