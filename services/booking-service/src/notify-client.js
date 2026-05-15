// Direct gRPC client to notification-service.
// Used as a FALLBACK when Kafka is not available, so notifications
// still work in local development without Docker/Kafka.

const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_DIR = process.env.PROTO_DIR || path.resolve(__dirname, "..", "..", "..", "proto");
const NOTIFICATION_TARGET = process.env.NOTIFICATION_GRPC_TARGET || "localhost:50053";
const HOTEL_TARGET = process.env.HOTEL_GRPC_TARGET || "localhost:50051";

// Load notification proto
const notifPkg = protoLoader.loadSync(path.join(PROTO_DIR, "notification.proto"), {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const notifClient = new (grpc.loadPackageDefinition(notifPkg).notification.NotificationService)(
  NOTIFICATION_TARGET, grpc.credentials.createInsecure()
);

// Load hotel proto (to get hotel name + room number)
const hotelPkg = protoLoader.loadSync(path.join(PROTO_DIR, "hotel.proto"), {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const hotelClient = new (grpc.loadPackageDefinition(hotelPkg).hotel.HotelService)(
  HOTEL_TARGET, grpc.credentials.createInsecure()
);

function call(client, method, req) {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + 2000);
    client[method](req, { deadline }, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

async function getHotelInfo(hotelId, roomId) {
  let hotelName = hotelId, roomNumber = roomId;
  try { const h = await call(hotelClient, "GetHotel", { id: hotelId }); hotelName = h.name || hotelId; } catch (_) {}
  try { const r = await call(hotelClient, "GetRoom", { id: roomId }); roomNumber = r.number || roomId; } catch (_) {}
  return { hotelName, roomNumber };
}

/**
 * Send a notification directly via gRPC (bypasses Kafka).
 * @param {object} booking - the booking object
 * @param {"BOOKING_CONFIRMED"|"BOOKING_CANCELLED"} type
 */
async function notifyDirect(booking, type) {
  try {
    const { hotelName, roomNumber } = await getHotelInfo(booking.hotel_id, booking.room_id);
    const dateRange = (booking.check_in && booking.check_out)
      ? `from ${booking.check_in} to ${booking.check_out}` : "";

    let title, message;
    if (type === "BOOKING_CONFIRMED") {
      title = `✅ Booking confirmed at ${hotelName}`;
      message = `Hi ${booking.user_name || "guest"}, your booking at ${hotelName} (room ${roomNumber}) ${dateRange} for ${booking.nights} night(s) is confirmed. Total: $${booking.total_price}.`;
    } else {
      title = `❌ Booking cancelled at ${hotelName}`;
      message = `Hi ${booking.user_name || "guest"}, your booking at ${hotelName} (room ${roomNumber}) ${dateRange} has been cancelled. The room is now available again.`;
    }

    await call(notifClient, "CreateNotification", {
      user_email: booking.user_email,
      type,
      title,
      message,
      related_id: booking.id
    });

    console.log(`[booking-service] notification sent via gRPC -> ${booking.id}`);
  } catch (err) {
    console.warn(`[booking-service] direct notification failed: ${err.message}`);
  }
}

module.exports = { notifyDirect };
