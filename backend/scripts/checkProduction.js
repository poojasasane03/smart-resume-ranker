// Checks the safety rules for the online version. It needs no database and no internet.
// Run from the backend folder:  node scripts/checkProduction.js
const express = require("express");
const { findProductionProblems } = require("../config/productionChecks");
const { checkSignup } = require("../utils/signupPolicy");
const { applySecurity } = require("../config/security");
const { getRetentionDays } = require("../services/retentionService");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

const goodEnv = {
  NODE_ENV: "production",
  JWT_SECRET: "k3Jd8sLq0Zx7VbN2mQw9RtYu4HfG6aPc1EoI5",
  MONGO_URI:
    "mongodb+srv://appuser:Xy7pQ2mK9vL4@cluster0.abcde.mongodb.net/smart-resume-ranker",
};
const problemsWith = (changes) =>
  findProductionProblems({ ...goodEnv, ...changes });

console.log("Starting in production");
check(
  "a good setup has no problems",
  findProductionProblems(goodEnv).length === 0,
);
check(
  "a short secret is refused",
  problemsWith({ JWT_SECRET: "short" }).length > 0,
);
check(
  "a placeholder secret is refused",
  problemsWith({ JWT_SECRET: "put_a_long_random_string_here_please_change_it" })
    .length > 0,
);
check(
  "a missing database address is refused",
  problemsWith({ MONGO_URI: "" }).length > 0,
);
check(
  "a database address that is not mongodb is refused",
  problemsWith({ MONGO_URI: "https://example.com" }).length > 0,
);
check(
  "a placeholder password in the database address is refused",
  problemsWith({
    MONGO_URI: "mongodb+srv://USERNAME:PASSWORD@cluster0.abcde.mongodb.net/db",
  }).length > 0,
);
check(
  "a short invite code is refused",
  problemsWith({ INVITE_CODE: "abc" }).length > 0,
);
check(
  "a good invite code is fine",
  problemsWith({ INVITE_CODE: "welcome-2026" }).length === 0,
);
check(
  "a wrong retention setting is refused",
  problemsWith({ RETENTION_DAYS: "abc" }).length > 0,
);
check(
  "a right retention setting is fine",
  problemsWith({ RETENTION_DAYS: "3" }).length === 0,
);

console.log("\nWho may sign up");
check(
  "on your own computer sign-up is open",
  checkSignup({ NODE_ENV: "development" }, undefined).allowed === true,
);
const closed = checkSignup({ NODE_ENV: "production" }, undefined);
check(
  "online with nothing set, sign-up is closed (403)",
  closed.allowed === false && closed.status === 403,
);
check(
  "online, sign-up can be opened on purpose",
  checkSignup({ NODE_ENV: "production", ALLOW_OPEN_SIGNUP: "true" }, undefined)
    .allowed === true,
);
const withCode = { NODE_ENV: "production", INVITE_CODE: "welcome-2026" };
check(
  "the right invite code is accepted",
  checkSignup(withCode, "welcome-2026").allowed === true,
);
check(
  "the invite code is accepted with spaces around it",
  checkSignup(withCode, "  welcome-2026 ").allowed === true,
);
check(
  "a wrong invite code is refused (403)",
  checkSignup(withCode, "welcome-2027").status === 403,
);
check(
  "a missing invite code is refused",
  checkSignup(withCode, undefined).allowed === false,
);
check(
  "an invite code that is not text is refused",
  checkSignup(withCode, { $ne: "" }).allowed === false,
);
check(
  "an empty invite code is refused",
  checkSignup(withCode, "").allowed === false,
);
check(
  "with an invite code set, it is needed even on your own computer",
  checkSignup({ NODE_ENV: "development", INVITE_CODE: "welcome-2026" }, "nope")
    .allowed === false,
);

console.log("\nHow long resumes are kept");
check(
  "not set, on your own computer: never deleted (0)",
  getRetentionDays({ NODE_ENV: "development" }) === 0,
);
check(
  "not set, online: 7 days",
  getRetentionDays({ NODE_ENV: "production" }) === 7,
);
check(
  "a chosen number is used",
  getRetentionDays({ NODE_ENV: "production", RETENTION_DAYS: "3" }) === 3,
);
check(
  "0 switches deletion off",
  getRetentionDays({ NODE_ENV: "production", RETENTION_DAYS: "0" }) === 0,
);
check(
  "text is not valid (null)",
  getRetentionDays({ RETENTION_DAYS: "abc" }) === null,
);
check(
  "a negative number is not valid",
  getRetentionDays({ RETENTION_DAYS: "-1" }) === null,
);
check(
  "a number with decimals is not valid",
  getRetentionDays({ RETENTION_DAYS: "2.5" }) === null,
);
check(
  "more than 365 is not valid",
  getRetentionDays({ RETENTION_DAYS: "400" }) === null,
);

async function headersFor(env) {
  const app = express();
  applySecurity(app, env);
  app.get("/", (req, res) => res.send("ok"));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  const result = {
    headers: response.headers,
    trustProxy: app.get("trust proxy"),
  };
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve)); // wait until it is really closed
  return result;
}

async function run() {
  console.log("\nSecurity headers");
  const dev = await headersFor({ NODE_ENV: "development" });
  const csp = dev.headers.get("content-security-policy") || "";
  check(
    "a content security policy is sent",
    csp.includes("default-src 'self'"),
  );
  check(
    "scripts may only come from this site",
    csp.includes("script-src 'self'"),
  );
  check(
    "it does not force https on http://localhost",
    !csp.includes("upgrade-insecure-requests"),
  );
  check(
    "the browser may not guess file types",
    dev.headers.get("x-content-type-options") === "nosniff",
  );
  check(
    "the site cannot be shown inside another site",
    Boolean(dev.headers.get("x-frame-options")),
  );
  check(
    "the server does not announce that it is Express",
    dev.headers.get("x-powered-by") === null,
  );
  check("on your own computer the proxy setting is off", !dev.trustProxy);

  const prod = await headersFor({ NODE_ENV: "production" });
  check(
    "online, the proxy setting is on (the rate limit sees each visitor)",
    prod.trustProxy === 1,
  );

  console.log(
    failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
  );
  process.exitCode = failed > 0 ? 1 : 0; // let the program end by itself (process.exit() can crash on Windows) process.exit(failed > 0 ? 1 : 0);
}

run();
