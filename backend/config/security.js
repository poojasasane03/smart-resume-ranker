const helmet = require("helmet");

// Security headers and proxy settings. Called once from app.js.
function applySecurity(app, env = process.env) {
  // Behind a host's proxy (Render, Railway...) the real visitor address arrives in a header.
  // Without this, the rate limiter would treat every visitor as the same person.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        // This directive makes some browsers try https even on http://localhost, which breaks local work
        directives: { "upgrade-insecure-requests": null },
      },
    }),
  );
}

module.exports = { applySecurity };
