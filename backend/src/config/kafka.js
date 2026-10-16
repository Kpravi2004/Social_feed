const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.INSTANCE_ID || "api",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: { retries: 5 },
});

const producer = kafka.producer();
let connected = false;

async function getProducer() {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log(`[${process.env.INSTANCE_ID || "api"}] Kafka producer connected`);
  }
  return producer;
}

// Topics used across the system — defined once, referenced everywhere
const TOPICS = {
  POST_CREATED: "post.created",
  POST_LIKED: "post.liked",
};

module.exports = { getProducer, TOPICS };
