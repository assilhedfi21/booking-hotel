const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_DIR = path.resolve(__dirname, "..", "..", "..", "proto");

function loadProto(file) {
  const pkg = protoLoader.loadSync(path.join(PROTO_DIR, file), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  return grpc.loadPackageDefinition(pkg);
}

const hotelProto = loadProto("hotel.proto").hotel;
const bookingProto = loadProto("booking.proto").booking;
const notificationProto = loadProto("notification.proto").notification;

const HOTEL_TARGET = process.env.HOTEL_GRPC_TARGET || "localhost:50051";
const BOOKING_TARGET = process.env.BOOKING_GRPC_TARGET || "localhost:50052";
const NOTIFICATION_TARGET = process.env.NOTIFICATION_GRPC_TARGET || "localhost:50053";

const hotelClient = new hotelProto.HotelService(HOTEL_TARGET, grpc.credentials.createInsecure());
const bookingClient = new bookingProto.BookingService(BOOKING_TARGET, grpc.credentials.createInsecure());
const notificationClient = new notificationProto.NotificationService(
  NOTIFICATION_TARGET,
  grpc.credentials.createInsecure()
);

// Promisify a unary gRPC call. Each gateway call goes through here so
// errors are translated into clean rejected promises.
function call(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request || {}, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  hotelClient,
  bookingClient,
  notificationClient,
  call
};
