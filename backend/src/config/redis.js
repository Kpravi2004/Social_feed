const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("connect", () => {
  console.log(`[${process.env.INSTANCE_ID || "api"}] Redis connected`);
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

module.exports = redis;
