const crypto = require("crypto");

// Comparing two digests (not the raw texts) in constant time, so the code cannot be guessed from timing
const digest = (value) =>
  crypto.createHash("sha256").update(String(value)).digest();

// Decides whether a sign-up is allowed.
// Returns { allowed: true } or { allowed: false, status, message }.
function checkSignup(env, inviteCode) {
  const required = (env.INVITE_CODE || "").trim();

  if (required) {
    const given = typeof inviteCode === "string" ? inviteCode.trim() : "";
    if (!crypto.timingSafeEqual(digest(given), digest(required))) {
      return {
        allowed: false,
        status: 403,
        message: "A valid invite code is required to sign up.",
      };
    }
    return { allowed: true };
  }

  // Online (production) sign-up stays closed unless it is switched on on purpose
  if (env.NODE_ENV === "production" && env.ALLOW_OPEN_SIGNUP !== "true") {
    return {
      allowed: false,
      status: 403,
      message: "Sign-up is closed on this site.",
    };
  }

  return { allowed: true };
}

module.exports = { checkSignup };
