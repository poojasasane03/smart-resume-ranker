// Tests the Node side of the NLP connection with a pretend Python service.
// It needs neither Python nor the model. Run from the backend folder:  node scripts/checkNlpClient.js
const http = require("http");
const { readConfig } = require("../config/nlpConfig");
const { createNlpClient } = require("../services/nlpClient");

const SECRET = "test-secret-123456789";
let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

// ----- A pretend NLP service -----
const received = []; // every request body it gets
let behaviour = "ok"; // "ok" | "error" | "fail-second" | "slow"

const fake = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    received.push({ path: req.url, secret: req.headers["x-nlp-secret"], body });

    if (req.headers["x-nlp-secret"] !== SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end('{"detail":"Invalid or missing secret"}');
    }
    if (behaviour === "slow") return; // never answers, so the client must time out
    if (
      behaviour === "error" ||
      (behaviour === "fail-second" && received.length === 2)
    ) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end('{"detail":"boom"}');
    }

    const results = body.resumes.map((resume) => ({
      id: resume.id,
      semantic_similarity: 0.5,
      chunks: 3,
      skill_matches: resume.missing_skills.map((skill) => ({
        skill,
        line: "a line",
        similarity: 0.4,
        margin: 0.3,
      })),
    }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ model: "fake-model", results }));
  });
});

const makeItems = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `id${i}`,
    text: "Trained ML models to predict churn",
    redact: ["Priya Sharma", "priya@example.com"],
    missingSkills: ["Machine Learning"],
  }));

async function run() {
  await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${fake.address().port}`;
  const config = {
    enabled: true,
    url,
    secret: SECRET,
    timeoutMs: 3000,
    batchSize: 25,
  };

  console.log("Settings");
  check("no secret -> off", readConfig({}).enabled === false);
  check(
    "a short secret -> off",
    readConfig({ NLP_SECRET: "short" }).enabled === false,
  );
  check(
    "a secret and the default local address -> on",
    readConfig({ NLP_SECRET: SECRET }).enabled === true,
  );
  check(
    "localhost -> on",
    readConfig({ NLP_SECRET: SECRET, NLP_URL: "http://localhost:8000" })
      .enabled === true,
  );
  const remote = readConfig({
    NLP_SECRET: SECRET,
    NLP_URL: "https://nlp.example.com",
  });
  check(
    "a service on another computer is refused (resumes are personal data)",
    remote.enabled === false && remote.note.includes("personal data"),
  );
  check(
    "...unless NLP_ALLOW_REMOTE=true",
    readConfig({
      NLP_SECRET: SECRET,
      NLP_URL: "https://nlp.example.com",
      NLP_ALLOW_REMOTE: "true",
    }).enabled === true,
  );
  check(
    "a broken address -> off",
    readConfig({ NLP_SECRET: SECRET, NLP_URL: "not a url" }).enabled === false,
  );

  console.log("\nTalking to the service");
  const disabled = await createNlpClient({
    ...config,
    enabled: false,
  }).analyzeResumes({ jobText: "x", items: makeItems(3) });
  check(
    "switched off -> status off and no request is sent",
    disabled.status === "off" && received.length === 0,
  );

  const client = createNlpClient(config);
  const ok = await client.analyzeResumes({
    jobText: "Machine Learning Engineer\nTrain models.",
    items: makeItems(60),
  });
  check(
    "60 resumes are sent in 3 batches (25, 25, 10)",
    received.length === 3 &&
      [25, 25, 10].every((n, i) => received[i].body.resumes.length === n),
  );
  check(
    "status ok and every resume got an answer",
    ok.status === "ok" && ok.byId.size === 60,
  );
  check(
    "the secret header is sent",
    received.every((r) => r.secret === SECRET),
  );
  check(
    "the name and email to remove are sent along",
    received[0].body.resumes[0].redact.includes("Priya Sharma"),
  );
  check(
    "the missing skills are sent in the field the Python side expects",
    received[0].body.resumes[0].missing_skills[0] === "Machine Learning",
  );
  check(
    "the answer is stored in our own shape",
    ok.byId.get("id0").similarity === 0.5 &&
      ok.byId.get("id0").model === "fake-model" &&
      ok.byId.get("id0").skillHints[0].margin === 0.3,
  );

  console.log("\nWhen things go wrong (the client must never throw)");
  received.length = 0;
  behaviour = "error";
  const broken = await client.analyzeResumes({
    jobText: "x",
    items: makeItems(30),
  });
  check(
    "a 500 from the service -> status unavailable, no crash",
    broken.status === "unavailable" && broken.byId.size === 0,
  );

  received.length = 0;
  behaviour = "fail-second";
  const partial = await client.analyzeResumes({
    jobText: "x",
    items: makeItems(60),
  });
  check(
    "one failed batch -> status partial, the others are kept",
    partial.status === "partial" && partial.byId.size === 35,
  );

  received.length = 0;
  behaviour = "ok";
  const wrongSecret = await createNlpClient({
    ...config,
    secret: "a-different-secret-1234",
  }).analyzeResumes({ jobText: "x", items: makeItems(2) });
  check(
    "a wrong secret -> unavailable (the service answered 401)",
    wrongSecret.status === "unavailable",
  );

  behaviour = "slow";
  const started = Date.now();
  const slow = await createNlpClient({
    ...config,
    timeoutMs: 300,
  }).analyzeResumes({ jobText: "x", items: makeItems(2) });
  check(
    "a service that never answers -> unavailable after the timeout",
    slow.status === "unavailable" && Date.now() - started < 2500,
  );

  fake.closeAllConnections();
  await new Promise((resolve) => fake.close(resolve));
  const down = await client.analyzeResumes({
    jobText: "x",
    items: makeItems(2),
  });
  check(
    "a service that is not running -> unavailable",
    down.status === "unavailable",
  );

  console.log(
    failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

run();
