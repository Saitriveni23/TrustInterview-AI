// ============================================================
// utils/retry.js
// Generic exponential-backoff retry utility
// Usage: await withRetry(() => someAsyncFn(), 3, 300)
// ============================================================

/**
 * Retry an async function with exponential backoff.
 * @param {Function} fn           - Async function to retry
 * @param {number}   maxRetries   - Max attempts (default 3)
 * @param {number}   baseDelayMs  - Base delay in ms (doubles each retry)
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxRetries = 3, baseDelayMs = 300) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 300ms, 600ms, 1200ms
        console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

module.exports = { withRetry };
