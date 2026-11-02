const { Writable } = require("stream");
const { buildCsv, writePdf } = require("../services/reportService");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

const results = [
  {
    candidateName: "Priya Sharma",
    email: "priya@example.com",
    experienceYears: 3,
    score: 82,
    matchedSkills: ["Node.js", "MongoDB"],
    missingSkills: ["Docker"],
    breakdown: [
      { key: "required", label: "Required skills", score: 90, weight: 50 },
      { key: "experience", label: "Experience", score: 70, weight: 50 },
    ],
  },
  {
    candidateName: '=HYPERLINK("http://evil.example","click")',
    email: "evil@example.com",
    experienceYears: 0,
    score: 40,
    matchedSkills: [],
    missingSkills: ["Node.js"],
    breakdown: [],
  },
  {
    candidateName: 'Rahul "RK", Verma',
    email: "rahul@example.com",
    experienceYears: 1.5,
    score: 60,
    matchedSkills: ["Node.js"],
    missingSkills: [],
    breakdown: [],
  },
];

console.log("CSV");
const csv = buildCsv(results);
const lines = csv.split("\r\n").filter(Boolean);
console.log(csv);

check(
  "file starts with a BOM and the header row",
  csv.startsWith("\uFEFFRank,Candidate,Email"),
);
check("one header row + one row per candidate", lines.length === 4);
check(
  "a normal row is correct",
  lines[1] ===
    "1,Priya Sharma,priya@example.com,3,82,Strong match,90,,70,,,Node.js; MongoDB,Docker",
);
check(
  "a name starting with = is neutralised (formula injection)",
  lines[2].includes("'=HYPERLINK") && !lines[2].includes(",=HYPERLINK"),
);
check(
  "commas and quotes inside a name are escaped",
  lines[3].includes('"Rahul ""RK"", Verma"'),
);
check(
  "fit label follows the bands",
  lines[3].includes("Possible match") && lines[2].includes("Weak match"),
);

console.log("\nPDF");

function pdfToBuffer(job, list) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const sink = new Writable({
      write(chunk, encoding, done) {
        chunks.push(chunk);
        done();
      },
    });
    sink.on("finish", () => resolve(Buffer.concat(chunks)));
    sink.on("error", reject);
    writePdf(sink, job, list);
  });
}

(async () => {
  const job = { title: "Backend Developer", company: "Acme Technologies" };

  const small = await pdfToBuffer(job, results);
  check("PDF starts with %PDF-", small.subarray(0, 5).toString() === "%PDF-");
  check(
    "PDF ends properly (%%EOF)",
    small.toString("latin1").includes("%%EOF"),
  );

  const many = Array.from({ length: 60 }, (_, i) => ({
    ...results[0],
    candidateName: `Candidate ${i + 1}`,
  }));
  const big = await pdfToBuffer(job, many);
  const pages = (big.toString("latin1").match(/\/Type \/Page\b/g) || []).length;
  console.log(`  (60 candidates made ${pages} pages)`);
  check("many candidates continue on extra pages", pages >= 2);

  console.log(
    failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
  );
  process.exit(failed > 0 ? 1 : 0);
})();
