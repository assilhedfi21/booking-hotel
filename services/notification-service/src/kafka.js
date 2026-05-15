const { Kafka, logLevel } = require("kafkajs");
const { NotificationRepo } = require("./repository");
const { getHotelInfo } = require("./hotel-client");

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9094";

const TOPICS = {
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled"
};

let consumer = null;

function formatDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "";
  return `from ${checkIn} to ${checkOut}`;
}

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

          // Enrich the notification with a friendly hotel name and room
          // number. This is a synchronous gRPC call to hotel-service.
          const { hotelName, roomNumber } = await getHotelInfo(
            event.hotel_id,
            event.room_id
          );

          const dateRange = formatDateRange(event.check_in, event.check_out);

          if (topic === TOPICS.BOOKING_CREATED) {
            await NotificationRepo.create({
              user_email: event.user_email,
              type: "BOOKING_CONFIRMED",
              title: `✅ Booking confirmed at ${hotelName}`,
              message: `Hi ${event.user_name || "guest"}, your booking at ${hotelName} (room ${roomNumber}) ${dateRange} for ${event.nights} night(s) is confirmed. Total: $${event.total_price}.`,
              related_id: event.id
            });
          }

          if (topic === TOPICS.BOOKING_CANCELLED) {
            await NotificationRepo.create({
              user_email: event.user_email,
              type: "BOOKING_CANCELLED",
              title: `❌ Booking cancelled at ${hotelName}`,
              message: `Hi ${event.user_name || "guest"}, your booking at ${hotelName} (room ${roomNumber}) ${dateRange} has been cancelled. The room is now available again.`,
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
