// Problems that would make a production start unsafe.
// Returns a list of plain sentences. An empty list means everything is fine.
function findProductionProblems(env) {
  const problems = [];
  const secret = env.JWT_SECRET || "";
  const uri = env.MONGO_URI || "";

  if (secret.length < 32) {
    problems.push(
      "JWT_SECRET must be at least 32 characters long in production.",
    );
  }
  if (/put_a_long|change_me|example|secret123/i.test(secret)) {
    problems.push(
      "JWT_SECRET looks like a placeholder. Generate a new random one for production.",
    );
  }

  if (!uri) {
    problems.push("MONGO_URI is not set.");
  } else if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    problems.push("MONGO_URI must start with mongodb:// or mongodb+srv://");
  } else if (/<db_password>|USERNAME:PASSWORD|YOUR_PASSWORD/i.test(uri)) {
    problems.push("MONGO_URI still contains a placeholder password.");
  }

  if (env.INVITE_CODE && env.INVITE_CODE.trim().length < 8) {
    problems.push("INVITE_CODE should be at least 8 characters long.");
  }

  const days = env.RETENTION_DAYS;
  if (
    days !== undefined &&
    days !== "" &&
    !(
      Number.isInteger(Number(days)) &&
      Number(days) >= 0 &&
      Number(days) <= 365
    )
  ) {
    problems.push("RETENTION_DAYS must be a whole number between 0 and 365.");
  }

  return problems;
}

module.exports = { findProductionProblems };
