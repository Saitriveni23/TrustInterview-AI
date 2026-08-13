// ============================================================
// utils/question-cache.js
// In-memory LRU-style cache for generated question sets
// Keyed by (company + jobRole), TTL = 1 hour
// ============================================================

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES  = 100;

const cache = new Map();

function makeKey(company, jobRole) {
  return `${(company || "general").toLowerCase().trim()}::${(jobRole || "").toLowerCase().trim()}`;
}

function get(company, jobRole) {
  const key = makeKey(company, jobRole);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  console.log(`[QuestionCache] HIT for key: ${key}`);
  return entry.questions;
}

function set(company, jobRole, questions) {
  const key = makeKey(company, jobRole);
  // Evict oldest if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { questions, createdAt: Date.now() });
  console.log(`[QuestionCache] SET for key: ${key} (${questions.length} questions)`);
}

function invalidate(company, jobRole) {
  const key = makeKey(company, jobRole);
  cache.delete(key);
}

function stats() {
  return { size: cache.size, maxEntries: MAX_ENTRIES, ttlMs: CACHE_TTL_MS };
}

module.exports = { get, set, invalidate, stats };
