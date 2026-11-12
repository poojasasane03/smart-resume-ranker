// Windows ignores upper/lower case in file names. Linux, where the website will run, does not.
// This finds names that only work on Windows. Run from the backend folder:  node scripts/checkCase.js
const fs = require("fs");
const path = require("path");

const backendDir = path.resolve(__dirname, "..");
const projectDir = path.resolve(backendDir, "..");
const frontendDir = path.join(projectDir, "frontend");
const SKIP = ["node_modules", ".git", "uploads", "venv", "__pycache__"];

function walk(dir, extension) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, extension));
    else if (path.extname(entry.name) === extension) files.push(full);
  }
  return files;
}

// True only if every part of the path exists with exactly this upper/lower case
function existsExactCase(target) {
  const relative = path.relative(projectDir, path.resolve(target));
  if (relative.startsWith("..")) return true; // outside the project, not our business
  let current = projectDir;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    if (!fs.readdirSync(current).includes(part)) return false;
    current = path.join(current, part);
  }
  return true;
}

// Looks for a file the way Node does (with .js, .json or /index.js added)
function checkTarget(candidates) {
  const present = candidates.filter((candidate) => fs.existsSync(candidate));
  if (present.length === 0) return "this file does not exist";
  if (!present.some(existsExactCase))
    return "the file exists, but with different upper/lower case";
  return null;
}

const problems = [];
const shown = (file) =>
  path.relative(projectDir, file).split(path.sep).join("/");

// 1. every local file that the backend loads with require
const jsFiles = walk(backendDir, ".js");
for (const file of jsFiles) {
  // Comments are ignored, so a require() written inside a comment is not checked
  const code = fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const match of code.matchAll(
    /require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
  )) {
    const base = path.resolve(path.dirname(file), match[1]);
    const issue = checkTarget([
      base,
      `${base}.js`,
      `${base}.json`,
      path.join(base, "index.js"),
    ]);
    if (issue)
      problems.push(`${shown(file)}: require("${match[1]}") -> ${issue}`);
  }
}

// 2. src="..." and href="..." in the frontend pages
const htmlFiles = walk(frontendDir, ".html");
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
    const link = match[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(link)) continue; // http:, mailto:, data: ...
    const base = link.startsWith("/")
      ? path.join(frontendDir, link)
      : path.resolve(path.dirname(file), link);
    const issue = checkTarget([base]);
    if (issue) problems.push(`${shown(file)}: "${link}" -> ${issue}`);
  }
}

if (problems.length === 0) {
  console.log(
    `No upper/lower case problems found (${jsFiles.length} JavaScript files and ${htmlFiles.length} HTML files checked).`,
  );
} else {
  console.log("Names that may break on the website (Linux):\n");
  problems.forEach((problem) => console.log(` - ${problem}`));
  console.log(
    "\nFix the name in the code, or rename the file, so both use exactly the same letters.",
  );
  process.exit(1);
}
