const redis = require("../config/redis");

// Simple token bucket per user/IP, backed by Redis so it works correctly
// across both api-1 and api-2 instances (in-memory limiters wouldn't).
function rateLimiter({ capacity = 20, refillPerSec = 5 } = {}) {
  return async function (req, res, next) {
    const key = `ratelimit:${req.userId || req.ip}`;
    const now = Date.now();

    try {
      const bucket = await redis.hgetall(key);
      let tokens = bucket.tokens ? parseFloat(bucket.tokens) : capacity;
      const lastRefill = bucket.lastRefill ? parseInt(bucket.lastRefill, 10) : now;

      const elapsedSec = (now - lastRefill) / 1000;
      tokens = Math.min(capacity, tokens + elapsedSec * refillPerSec);

      if (tokens < 1) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }

      tokens -= 1;
      await redis.hset(key, { tokens: tokens.toString(), lastRefill: now.toString() });
      await redis.expire(key, 60);

      next();
    } catch (err) {
      // Fail open — a Redis outage shouldn't take down the whole API,
      // it should just mean rate limiting is temporarily disabled.
      console.error("Rate limiter error, failing open:", err.message);
      next();
    }
  };
}

module.exports = { rateLimiter };
