const Redis = require("ioredis");
const { sendToUser } = require("./registry");

const CHANNEL = "notifications";

// ioredis requires a dedicated connection for subscribe mode — a
// subscribed client can't run normal commands, so we can't reuse the
// shared cache/rate-limiter client here.
const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const publisher = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

function startNotificationBridge() {
  subscriber.subscribe(CHANNEL, (err) => {
    if (err) {
      console.error("Failed to subscribe to notifications:", err.message);
      return;
    }
    console.log(`[${process.env.INSTANCE_ID || "api"}] notification bridge active`);
  });

  subscriber.on("message", (channel, raw) => {
    if (channel !== CHANNEL) return;
    try {
      const { userId, payload } = JSON.parse(raw);
      sendToUser(userId, payload);
    } catch (err) {
      console.error("Bad notification payload:", err.message);
    }
  });
}

async function publishNotification(userId, payload) {
  await publisher.publish(CHANNEL, JSON.stringify({ userId, payload }));
}

module.exports = { startNotificationBridge, publishNotification, CHANNEL };
