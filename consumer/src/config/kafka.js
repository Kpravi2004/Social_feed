const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "fanout-consumer",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: { retries: 8 },
});

// Consumer group ID matters: if you ever scale to multiple consumer
// instances, Kafka partitions the topic across them automatically.
const consumer = kafka.consumer({ groupId: "fanout-group" });

const TOPICS = {
  POST_CREATED: "post.created",
  POST_LIKED: "post.liked",
};

module.exports = { consumer, TOPICS };
