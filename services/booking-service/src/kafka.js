const { Kafka, logLevel } = require("kafkajs");

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9094";

const TOPICS = {
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled"
};

let producer = null;
let connected = false;

async function startKafka() {
  try {
    const kafka = new Kafka({
      clientId: "booking-service",
      brokers: [KAFKA_BROKER],
      logLevel: logLevel.NOTHING,
      retry: { retries: 3 }
    });
    producer = kafka.producer();
    await producer.connect();
    connected = true;
    console.log(`[booking-service] Kafka producer connected on ${KAFKA_BROKER}`);
  } catch (err) {
    console.warn(`[booking-service] Kafka not available (${err.message}). Events will be skipped.`);
  }
}

async function publish(topic, payload) {
  if (!connected || !producer) {
    console.warn(`[booking-service] skipping publish on ${topic} (no Kafka)`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [{ key: payload.id || null, value: JSON.stringify(payload) }]
    });
    console.log(`[booking-service] event published on ${topic} -> ${payload.id}`);
  } catch (err) {
    console.error(`[booking-service] publish error on ${topic}:`, err.message);
  }
}

async function stopKafka() {
  if (producer) {
    try { await producer.disconnect(); } catch (_) { /* ignore */ }
  }
}

module.exports = { startKafka, stopKafka, publish, TOPICS, isConnected: () => connected };
