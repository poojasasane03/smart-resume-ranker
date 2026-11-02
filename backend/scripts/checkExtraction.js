const { extractInfo } = require("../services/extractionService");

const SAMPLE = `PRIYA SHARMA
priya.sharma@example.com | +91 98765 43210

SUMMARY
Backend developer with 2 years of experience building REST APIs.

SKILLS
Node.js, Express.js, MongoDB, JavaScript, Docker, Git

EXPERIENCE
Software Developer, Acme Technologies
Jan 2023 - Dec 2024

EDUCATION
B.Tech in Computer Science, 2018 - 2022
`;

const info = extractInfo(SAMPLE, "priya_resume.pdf");
console.log(info, "\n");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

check("name is found and tidied", info.candidateName === "Priya Sharma");
check("email is found", info.email === "priya.sharma@example.com");
check(
  "skills include Node.js, MongoDB, Docker",
  ["Node.js", "MongoDB", "Docker"].every((s) => info.skills.includes(s)),
);
check("Java is NOT found inside JavaScript", !info.skills.includes("Java"));
check(
  "education years are NOT counted as experience",
  info.experienceYears === 2,
);
check(
  "education line is found",
  info.education.length === 1 && info.education[0].includes("B.Tech"),
);

console.log(
  failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
);
process.exit(failed > 0 ? 1 : 0);
