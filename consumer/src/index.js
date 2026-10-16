require("dotenv").config();
const { connectMongo } = require("./config/db");
const { consumer, TOPICS } = require("./config/kafka");
const { fanOutPost, handleLike } = require("./fanout");

async function start() {
  await connectMongo();
  await consumer.connect();
  await consumer.subscribe({ topics: [TOPICS.POST_CREATED, TOPICS.POST_LIKED] });

  console.log("[consumer] listening for events");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let payload;
      try {
        payload = JSON.parse(message.value.toString());
      } catch (err) {
        // Malformed message — log and move on rather than blocking the
        // partition forever by throwing.
        console.error("[consumer] bad message, skipping:", err.message);
        return;
      }

      try {
        if (topic === TOPICS.POST_CREATED) {
          await fanOutPost(payload);
        } else if (topic === TOPICS.POST_LIKED) {
          await handleLike(payload);
        }
      } catch (err) {
        // Throwing here makes Kafka retry the message. That's what we
        // want for transient failures (Mongo blip), but a permanently
        // bad message would loop forever — a dead-letter topic is the
        // production answer. Noted as a known limitation.
        console.error(`[consumer] error handling ${topic}:`, err.message);
        throw err;
      }
    },
  });
}

// Graceful shutdown so in-flight messages finish and offsets commit
// cleanly instead of being reprocessed on restart.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    console.log(`[consumer] ${signal} received, shutting down`);
    try {
      await consumer.disconnect();
    } finally {
      process.exit(0);
    }
  });
}

start().catch((err) => {
  console.error("[consumer] failed to start:", err);
  process.exit(1);
});
