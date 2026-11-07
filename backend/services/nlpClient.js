const { NLP } = require("../config/nlpConfig");

// The client never throws: if the Python service is off, slow or broken, ranking still works
// with exact matching only. It also never logs resume text.
function createNlpClient(config) {
  async function postJson(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${config.url}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NLP-Secret": config.secret,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `the NLP service answered with status ${response.status}`,
        );
      }
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("the NLP service took too long to answer");
      }
      if (error.message === "fetch failed") {
        throw new Error("could not reach the NLP service (is it running?)");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  // items: [{ id, text, redact: [name, email], missingSkills: [...] }]
  // returns: { status: "off" | "ok" | "partial" | "unavailable", byId: Map(id -> semantic data) }
  async function analyzeResumes({ jobText, items }) {
    const byId = new Map();
    if (!config.enabled || items.length === 0) {
      return { status: "off", byId };
    }

    let okBatches = 0;
    let failedBatches = 0;

    for (let start = 0; start < items.length; start += config.batchSize) {
      const batch = items.slice(start, start + config.batchSize);

      try {
        const data = await postJson("/analyze", {
          job_text: jobText,
          resumes: batch.map((item) => ({
            id: item.id,
            text: item.text,
            redact: item.redact,
            missing_skills: item.missingSkills,
          })),
        });

        if (!Array.isArray(data.results)) {
          throw new Error("the NLP service sent an unexpected answer");
        }

        for (const result of data.results) {
          byId.set(result.id, {
            similarity: result.semantic_similarity,
            model: data.model,
            skillHints: result.skill_matches,
          });
        }
        okBatches++;
      } catch (error) {
        failedBatches++;
        console.warn(
          `Semantic analysis skipped for ${batch.length} resume(s): ${error.message}`,
        );
      }
    }

    const status =
      failedBatches === 0 ? "ok" : okBatches === 0 ? "unavailable" : "partial";
    return { status, byId };
  }

  // Is the Python service reachable, and has it finished loading the model?
  // returns "off" | "up" | "loading" | "down". It never throws.
  async function checkHealth() {
    if (!config.enabled) return "off";

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      config.healthTimeoutMs || 2000,
    );

    try {
      const response = await fetch(`${config.url}/health`, {
        signal: controller.signal,
      });

      if (!response.ok) return "down";

      const data = await response.json();
      return data.model_loaded ? "up" : "loading";
    } catch (error) {
      return "down";
    } finally {
      clearTimeout(timer);
    }
  }

  return { analyzeResumes, checkHealth };
}

module.exports = { createNlpClient, nlpClient: createNlpClient(NLP) };
