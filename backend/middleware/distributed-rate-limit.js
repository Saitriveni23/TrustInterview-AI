const { redis } = require("../config/redis");

function distributedRateLimit({ windowSeconds = 60, max = 300 } = {}) {
  return async (req, res, next) => {
    try {
      const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
      const identity = req.auth?.uid || req.ip;
      const key = `rate:${identity}:${bucket}`;
      const results = await redis.multi().incr(key).expire(key, windowSeconds + 5).exec();
      const count = Number(results?.[0]?.[1] || 0);
      res.set("RateLimit-Limit", String(max));
      res.set("RateLimit-Remaining", String(Math.max(0, max - count)));
      if (count > max) return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests.", requestId: req.id } });
      next();
    } catch (error) {
      if (process.env.NODE_ENV === "production") return next(error);
      next();
    }
  };
}

module.exports = { distributedRateLimit };
