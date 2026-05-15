const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const { BookingRepo } = require("./repository");
const { startKafka, stopKafka, publish, TOPICS, isConnected } = require("./kafka");
const { notifyDirect } = require("./notify-client");

const PROTO_DIR = process.env.PROTO_DIR || path.resolve(__dirname, "..", "..", "..", "proto");
const PROTO_PATH = path.join(PROTO_DIR, "booking.proto");
const PORT = process.env.BOOKING_GRPC_PORT || 50052;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const handlers = {
  CreateBooking(call, callback) {
    try {
      const required = ["user_email", "hotel_id", "room_id", "check_in", "check_out"];
      for (const f of required) {
        if (!call.request[f]) {
          return callback({ code: grpc.status.INVALID_ARGUMENT, message: `${f} is required` });
        }
      }
      const booking = BookingRepo.create(call.request);
      // Try Kafka first; if unavailable, notify directly via gRPC
      if (isConnected()) {
        publish(TOPICS.BOOKING_CREATED, booking).catch(() => {});
      } else {
        notifyDirect(booking, "BOOKING_CONFIRMED").catch(() => {});
      }
      callback(null, booking);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  GetBooking(call, callback) {
    const booking = BookingRepo.findById(call.request.id);
    if (!booking) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Booking not found" });
    }
    callback(null, booking);
  },

  ListBookings(call, callback) {
    callback(null, BookingRepo.list(call.request));
  },

  ListBookingsByUser(call, callback) {
    callback(null, BookingRepo.listByUser(call.request.user_email));
  },

  CancelBooking(call, callback) {
    const booking = BookingRepo.cancel(call.request.id);
    if (!booking) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Booking not found" });
    }
    if (isConnected()) {
      publish(TOPICS.BOOKING_CANCELLED, booking).catch(() => {});
    } else {
      notifyDirect(booking, "BOOKING_CANCELLED").catch(() => {});
    }
    callback(null, booking);
  }
};

function main() {
  const server = new grpc.Server();
  server.addService(bookingProto.BookingService.service, handlers);
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error("[booking-service] failed to bind:", err);
      process.exit(1);
    }
    console.log(`[booking-service] gRPC server listening on port ${port}`);
    startKafka();
  });

  process.on("SIGINT", async () => {
    await stopKafka();
    server.tryShutdown(() => process.exit(0));
  });
}

main();
