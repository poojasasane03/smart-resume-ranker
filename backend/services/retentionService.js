// Deletes resumes (and everything built from them) after some days,
// so personal data is not kept for ever.

// How many days to keep resumes. 0 = never delete. null = the setting is not valid.
function getRetentionDays(env) {
  if (env.RETENTION_DAYS === undefined || env.RETENTION_DAYS === "") {
    return env.NODE_ENV === "production" ? 7 : 0;
  }
  const days = Number(env.RETENTION_DAYS);
  return Number.isInteger(days) && days >= 0 && days <= 365 ? days : null;
}

function createRetentionService({
  Resume,
  RankingResult,
  deleteFile,
  now = () => Date.now(),
}) {
  async function purgeOlderThan(days) {
    if (!(days > 0)) return { deleted: 0 };

    const cutoff = new Date(now() - days * 24 * 60 * 60 * 1000);
    let deleted = 0;

    // Small batches, so a big backlog never blocks the server for long
    for (;;) {
      const batch = await Resume.find({ createdAt: { $lt: cutoff } })
        .select("storedName")
        .limit(200);
      if (batch.length === 0) break;

      const ids = batch.map((resume) => resume._id);
      await RankingResult.deleteMany({ resume: { $in: ids } });
      const result = await Resume.deleteMany({ _id: { $in: ids } });
      await Promise.all(batch.map((resume) => deleteFile(resume.storedName)));

      if (!result || result.deletedCount === 0) break; // nothing was removed, so do not loop for ever
      deleted += result.deletedCount;
    }

    return { deleted };
  }

  return { purgeOlderThan };
}

// Runs the cleanup once when the server starts and then every few hours
function startRetentionSchedule(
  days,
  service,
  { intervalMs = 6 * 60 * 60 * 1000, log = console } = {},
) {
  if (!(days > 0)) {
    log.log("Automatic deletion of old resumes is off");
    return null;
  }

  const run = async () => {
    try {
      const { deleted } = await service.purgeOlderThan(days);
      if (deleted > 0)
        log.log(`Deleted ${deleted} resume(s) older than ${days} day(s)`);
    } catch (error) {
      log.warn(`Cleanup of old resumes failed: ${error.message}`);
    }
  };

  log.log(`Resumes are deleted automatically after ${days} day(s)`);
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref(); // this timer alone must not keep the program alive
  return timer;
}

module.exports = {
  getRetentionDays,
  createRetentionService,
  startRetentionSchedule,
};
