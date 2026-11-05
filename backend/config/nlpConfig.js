// Settings for the Python NLP service (semantic matching)

// Resumes contain personal data, so by default we only talk to a service on this same computer
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

function readConfig(env) {
  const config = {
    enabled: false,
    url: (env.NLP_URL || "http://127.0.0.1:8000").replace(/\/+$/, ""),
    secret: env.NLP_SECRET || "",
    timeoutMs: Number(env.NLP_TIMEOUT_MS) || 60000,
    batchSize: 25, // resumes per request (the Python service accepts up to 200)
    note: "",
  };

  if (config.secret.length < 16) {
    config.note = "NLP_SECRET is not set in backend/.env";
    return config;
  }

  let host;
  try {
    host = new URL(config.url).hostname;
  } catch (error) {
    config.note = "NLP_URL is not a valid address";
    return config;
  }

  if (!LOCAL_HOSTS.includes(host) && env.NLP_ALLOW_REMOTE !== "true") {
    config.note = `NLP_URL points to "${host}", which is not this computer. Resumes contain personal data, so this was refused. Set NLP_ALLOW_REMOTE=true only if you fully trust that server.`;
    return config;
  }

  config.enabled = true;
  return config;
}

const NLP = readConfig(process.env);

if (NLP.enabled) {
  console.log(`Semantic matching is on (${NLP.url})`);
} else {
  console.warn(`Semantic matching is off: ${NLP.note}`);
}

module.exports = { NLP, readConfig };
