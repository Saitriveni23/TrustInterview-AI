const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on("error", (error) => {
  console.error(JSON.stringify({ level: "error", event: "redis_error", message: error.message }));
});

async function connectRedis() {
  if (redis.status === "wait") await redis.connect();
  return redis;
}

module.exports = { redis, connectRedis };
