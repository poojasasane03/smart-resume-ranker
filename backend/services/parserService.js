const path = require("path");
const crypto = require("crypto");
// We import the library's inner file on purpose: the main file has a "debug mode"
// that tries to open a test PDF and can crash with an ENOENT error.
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const mammoth = require("mammoth");

const ALLOWED_TYPES = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const PARSE_TIMEOUT_MS = 15000;
const MAX_TEXT_CHARS = 100000;

function getExtension(fileName) {
  return path.extname(fileName).toLowerCase();
}

// The real type of a file is in its first bytes, not in its name.
function hasValidSignature(buffer, ext) {
  if (ext === ".pdf") {
    return buffer.subarray(0, 1024).includes("%PDF-");
  }
  if (ext === ".docx") {
    return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // "PK" zip header
  }
  return false;
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Give up if a file takes too long to read
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Parsing took too long")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function cleanText(raw) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // control characters
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

async function extractText(buffer, ext) {
  let raw = "";

  if (ext === ".pdf") {
    const result = await withTimeout(pdfParse(buffer), PARSE_TIMEOUT_MS);
    raw = result.text || "";
  } else if (ext === ".docx") {
    const result = await withTimeout(
      mammoth.extractRawText({ buffer }),
      PARSE_TIMEOUT_MS,
    );
    raw = result.value || "";
  }

  return cleanText(raw);
}

module.exports = {
  ALLOWED_TYPES,
  getExtension,
  hasValidSignature,
  hashBuffer,
  extractText,
};
