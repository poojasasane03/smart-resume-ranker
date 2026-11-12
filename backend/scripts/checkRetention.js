// Checks the automatic deletion of old resumes with a pretend database. It needs no database.
// Run from the backend folder:  node scripts/checkRetention.js
const {
  createRetentionService,
  startRetentionSchedule,
} = require("../services/retentionService");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 10);

// A pretend database and file store
function makeFakes({ stuck = false } = {}) {
  const store = { resumes: [], rankings: [], deletedFiles: [], batchSizes: [] };

  const Resume = {
    find(filter) {
      const matches = store.resumes.filter(
        (r) => r.createdAt < filter.createdAt.$lt,
      );
      const chain = {
        limit(n) {
          chain.max = n;
          return chain;
        },
        select() {
          return chain;
        },
        then(resolve, reject) {
          const batch = matches.slice(0, chain.max ?? matches.length);
          store.batchSizes.push(batch.length);
          return Promise.resolve(batch).then(resolve, reject);
        },
      };
      return chain;
    },
    deleteMany(filter) {
      if (stuck) return Promise.resolve({ deletedCount: 0 });
      const ids = new Set(filter._id.$in.map(String));
      const before = store.resumes.length;
      store.resumes = store.resumes.filter((r) => !ids.has(String(r._id)));
      return Promise.resolve({ deletedCount: before - store.resumes.length });
    },
  };

  const RankingResult = {
    deleteMany(filter) {
      const ids = new Set(filter.resume.$in.map(String));
      store.rankings = store.rankings.filter((x) => !ids.has(String(x.resume)));
      return Promise.resolve({ deletedCount: 0 });
    },
  };

  const deleteFile = async (name) => {
    store.deletedFiles.push(name);
  };
  return { store, Resume, RankingResult, deleteFile };
}

const addResume = (store, id, ageInDays) => {
  store.resumes.push({
    _id: id,
    storedName: `${id}.pdf`,
    createdAt: new Date(NOW - ageInDays * DAY),
  });
  store.rankings.push({ resume: id });
};

async function run() {
  console.log("Deleting old resumes");
  {
    const f = makeFakes();
    addResume(f.store, "old1", 10);
    addResume(f.store, "old2", 8);
    addResume(f.store, "new1", 2);
    addResume(f.store, "edge", 6.9);
    const service = createRetentionService({ ...f, now: () => NOW });
    const result = await service.purgeOlderThan(7);

    check(
      "resumes older than 7 days are deleted",
      result.deleted === 2 &&
        !f.store.resumes.some((r) => r._id.startsWith("old")),
    );
    check(
      "newer resumes are kept",
      f.store.resumes
        .map((r) => r._id)
        .sort()
        .join() === "edge,new1",
    );
    check(
      "the ranking results of the deleted resumes are deleted too",
      f.store.rankings
        .map((x) => x.resume)
        .sort()
        .join() === "edge,new1",
    );
    check(
      "the files of the deleted resumes are deleted too",
      f.store.deletedFiles.sort().join() === "old1.pdf,old2.pdf",
    );
  }
  {
    const f = makeFakes();
    for (let i = 0; i < 450; i++) addResume(f.store, `r${i}`, 30);
    const result = await createRetentionService({
      ...f,
      now: () => NOW,
    }).purgeOlderThan(7);
    check(
      "a big backlog (450) is deleted completely",
      result.deleted === 450 &&
        f.store.resumes.length === 0 &&
        f.store.deletedFiles.length === 450,
    );
    check(
      "...in batches of at most 200",
      Math.max(...f.store.batchSizes) === 200,
    );
  }
  {
    const f = makeFakes();
    addResume(f.store, "old", 30);
    const result = await createRetentionService({
      ...f,
      now: () => NOW,
    }).purgeOlderThan(0);
    check(
      "0 days means nothing is deleted",
      result.deleted === 0 && f.store.resumes.length === 1,
    );
  }
  {
    const f = makeFakes({ stuck: true });
    addResume(f.store, "old", 30);
    const result = await createRetentionService({
      ...f,
      now: () => NOW,
    }).purgeOlderThan(7);
    check(
      "if the database removes nothing, the loop stops (no endless loop)",
      result.deleted === 0,
    );
  }

  console.log("\nThe schedule");
  const messages = { log: [], warn: [] };
  const log = {
    log: (m) => messages.log.push(m),
    warn: (m) => messages.warn.push(m),
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  check(
    "0 days: the schedule does not start",
    startRetentionSchedule(0, {}, { log }) === null,
  );

  let calls = 0;
  const counting = {
    purgeOlderThan: async () => {
      calls++;
      return { deleted: 3 };
    },
  };
  const timer = startRetentionSchedule(7, counting, { intervalMs: 60, log });
  await wait(20);
  check("it cleans once straight away", calls === 1);
  await wait(150);
  check("and then again and again", calls >= 3);
  check(
    "it reports how many resumes it deleted",
    messages.log.some((m) => m.includes("Deleted 3 resume")),
  );
  clearInterval(timer);

  const broken = {
    purgeOlderThan: async () => {
      throw new Error("database is down");
    },
  };
  const timer2 = startRetentionSchedule(7, broken, { intervalMs: 1000, log });
  await wait(30);
  check(
    "a failing cleanup is only reported, it does not crash the server",
    messages.warn.some((m) => m.includes("database is down")),
  );
  clearInterval(timer2);

  console.log(
    failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) failed`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

run();
