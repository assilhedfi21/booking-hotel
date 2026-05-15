const { Kafka, logLevel } = require("kafkajs");
const { NotificationRepo } = require("./repository");

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9094";

const TOPICS = {
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled"
};

let consumer = null;

async function startKafka() {
  try {
    const kafka = new Kafka({
      clientId: "notification-service",
      brokers: [KAFKA_BROKER],
      logLevel: logLevel.NOTHING,
      retry: { retries: 3 }
    });

    consumer = kafka.consumer({ groupId: "notification-service-group" });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.BOOKING_CREATED, fromBeginning: false });
    await consumer.subscribe({ topic: TOPICS.BOOKING_CANCELLED, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const event = JSON.parse(message.value.toString());

          if (topic === TOPICS.BOOKING_CREATED) {
            await NotificationRepo.create({
              user_email: event.user_email,
              type: "BOOKING_CONFIRMED",
              title: "Booking confirmed",
              message: `Your booking ${event.id} is confirmed for ${event.nights} night(s).`,
              related_id: event.id
            });
          }

          if (topic === TOPICS.BOOKING_CANCELLED) {
            await NotificationRepo.create({
              user_email: event.user_email,
              type: "BOOKING_CANCELLED",
              title: "Booking cancelled",
              message: `Your booking ${event.id} has been cancelled.`,
              related_id: event.id
            });
          }

          console.log(`[notification-service] processed event ${topic} -> ${event.id}`);
        } catch (err) {
          console.error("[notification-service] kafka message error:", err.message);
        }
      }
    });

    console.log(`[notification-service] Kafka consumer connected on ${KAFKA_BROKER}`);
  } catch (err) {
    console.warn(`[notification-service] Kafka not available (${err.message}). Continuing without it.`);
  }
}

async function stopKafka() {
  if (consumer) {
    try { await consumer.disconnect(); } catch (_) { /* ignore */ }
  }
}

module.exports = { startKafka, stopKafka };
