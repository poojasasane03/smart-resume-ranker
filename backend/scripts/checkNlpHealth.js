// Checks the "is the language service up?" test. It needs neither Python nor the database.
// Run from the backend folder:  node scripts/checkNlpHealth.js
const http = require("http");
const { createNlpClient } = require("../services/nlpClient");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

let behaviour = "ready"; // "ready" | "loading" | "error" | "slow"

// A pretend Python service with only the /health route
const fake = http.createServer((req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404);
    return res.end();
  }
  if (behaviour === "slow") return; // never answers
  if (behaviour === "error") {
    res.writeHead(500);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      service: "nlp-service",
      model_loaded: behaviour === "ready",
    }),
  );
});

async function run() {
  await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${fake.address().port}`;
  const config = {
    enabled: true,
    url,
    secret: "x".repeat(20),
    timeoutMs: 3000,
    batchSize: 25,
    healthTimeoutMs: 300,
  };
  const client = createNlpClient(config);

  console.log("Language service status");
  check(
    "switched off -> off",
    (await createNlpClient({ ...config, enabled: false }).checkHealth()) ===
      "off",
  );

  behaviour = "ready";
  check(
    "running and the model is loaded -> up",
    (await client.checkHealth()) === "up",
  );

  behaviour = "loading";
  check(
    "running but the model is still loading -> loading",
    (await client.checkHealth()) === "loading",
  );

  behaviour = "error";
  check(
    "answers with an error -> down",
    (await client.checkHealth()) === "down",
  );

  behaviour = "slow";
  const started = Date.now();
  check(
    "never answers -> down, and it does not wait for long",
    (await client.checkHealth()) === "down" && Date.now() - started < 1500,
  );

  fake.closeAllConnections();
  await new Promise((resolve) => fake.close(resolve));
  check("not running at all -> down", (await client.checkHealth()) === "down");

  console.log(
    failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

run();
