const { Kafka, logLevel } = require("kafkajs");
const { RoomRepo } = require("./repository");

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9094";
const TOPICS = {
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled"
};

let consumer = null;

async function startKafka() {
  try {
    const kafka = new Kafka({
      clientId: "hotel-service",
      brokers: [KAFKA_BROKER],
      logLevel: logLevel.NOTHING,
      retry: { retries: 3 }
    });

    consumer = kafka.consumer({ groupId: "hotel-service-group" });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.BOOKING_CREATED, fromBeginning: false });
    await consumer.subscribe({ topic: TOPICS.BOOKING_CANCELLED, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          if (topic === TOPICS.BOOKING_CREATED && event.room_id) {
            RoomRepo.setAvailability(event.room_id, false);
            console.log(`[hotel-service] room ${event.room_id} marked as unavailable`);
          }
          if (topic === TOPICS.BOOKING_CANCELLED && event.room_id) {
            RoomRepo.setAvailability(event.room_id, true);
            console.log(`[hotel-service] room ${event.room_id} released`);
          }
        } catch (err) {
          console.error("[hotel-service] kafka message error:", err.message);
        }
      }
    });

    console.log(`[hotel-service] Kafka consumer connected on ${KAFKA_BROKER}`);
  } catch (err) {
    console.warn(`[hotel-service] Kafka not available (${err.message}). Continuing without it.`);
  }
}

async function stopKafka() {
  if (consumer) {
    try { await consumer.disconnect(); } catch (_) { /* ignore */ }
  }
}

module.exports = { startKafka, stopKafka };
