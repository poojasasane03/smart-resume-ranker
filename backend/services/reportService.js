const PDFDocument = require("pdfkit");
const { FIT_BANDS } = require("../config/scoringConfig");

function fitLabel(score) {
  if (score >= FIT_BANDS.strong) return "Strong match";
  if (score >= FIT_BANDS.possible) return "Possible match";
  return "Weak match";
}

// ---------- CSV ----------
// A cell starting with = + - @ can run as a formula when the file is opened in Excel.
// Names and emails come from resumes, so we neutralise them with a leading quote.
function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const COMPONENT_COLUMNS = [
  ["required", "Required skills (%)"],
  ["optional", "Optional skills (%)"],
  ["experience", "Experience (%)"],
  ["keywords", "Keywords (%)"],
  ["education", "Education (%)"],
];

function buildCsv(results) {
  const header = [
    "Rank",
    "Candidate",
    "Email",
    "Experience (years)",
    "Score (%)",
    "Fit",
    ...COMPONENT_COLUMNS.map(([, title]) => title),
    "Matched skills",
    "Missing skills",
  ];

  const rows = results.map((result, index) => {
    const partScore = (key) => {
      const part = (result.breakdown || []).find((p) => p.key === key);
      return part ? part.score : "";
    };

    return [
      index + 1,
      result.candidateName,
      result.email,
      result.experienceYears,
      result.score,
      fitLabel(result.score),
      ...COMPONENT_COLUMNS.map(([key]) => partScore(key)),
      (result.matchedSkills || []).join("; "),
      (result.missingSkills || []).join("; "),
    ];
  });

  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n"; // BOM helps Excel read UTF-8 names correctly
}

// ---------- PDF ----------
// Writes the report into any writable stream (an HTTP response, or a file)
function writePdf(target, job, results) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(target);

  doc.font("Helvetica-Bold").fontSize(18).text("Candidate ranking report");
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#444444")
    .text(`${job.title} at ${job.company}`)
    .text(
      `Generated on ${new Date().toISOString().slice(0, 10)} | ${results.length} candidate(s)`,
    );
  doc.moveDown(0.5);
  doc
    .fontSize(9)
    .fillColor("#666666")
    .text(
      "Scores are a guide to help shortlist candidates. Hiring decisions are made by people.",
    );
  doc.moveDown();
  doc.fillColor("#000000");

  results.forEach((result, index) => {
    if (doc.y > doc.page.height - 150) doc.addPage();

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        `${index + 1}. ${result.candidateName || "Unknown"} - ${result.score}% (${fitLabel(result.score)})`,
      );

    doc.font("Helvetica").fontSize(9).fillColor("#444444");
    doc.text(
      `${result.email || "No email found"} | Experience: ${result.experienceYears ?? 0} yrs`,
    );
    doc.text(`Matched: ${(result.matchedSkills || []).join(", ") || "None"}`);
    doc.text(`Missing: ${(result.missingSkills || []).join(", ") || "None"}`);

    const parts = (result.breakdown || [])
      .map((p) => `${p.label} ${p.score}% (weight ${p.weight}%)`)
      .join("  |  ");
    if (parts) doc.text(`Breakdown: ${parts}`);

    doc.fillColor("#000000").moveDown(0.8);
  });

  doc.end();
}

module.exports = { buildCsv, writePdf, fitLabel };
