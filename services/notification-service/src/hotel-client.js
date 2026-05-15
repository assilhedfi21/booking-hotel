// Lightweight gRPC client used by the notification-service to enrich
// notifications with the hotel name and room number when it receives a
// booking event over Kafka.
//
// We keep this client local to the service to avoid coupling: only the
// notification-service knows it needs to look hotels up.

const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.resolve(__dirname, "..", "..", "..", "proto", "hotel.proto");
const HOTEL_TARGET = process.env.HOTEL_GRPC_TARGET || "localhost:50051";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const hotelProto = grpc.loadPackageDefinition(packageDefinition).hotel;

const client = new hotelProto.HotelService(
  HOTEL_TARGET,
  grpc.credentials.createInsecure()
);

function unary(method, request, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + timeoutMs);
    client[method](request, { deadline }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

async function getHotelInfo(hotelId, roomId) {
  // Best effort: if the hotel-service is unreachable we still produce
  // a notification, just with raw IDs.
  let hotelName = hotelId;
  let roomNumber = roomId;

  try {
    const hotel = await unary("GetHotel", { id: hotelId });
    if (hotel && hotel.name) hotelName = hotel.name;
  } catch (_) { /* ignore */ }

  try {
    const room = await unary("GetRoom", { id: roomId });
    if (room && room.number) roomNumber = room.number;
  } catch (_) { /* ignore */ }

  return { hotelName, roomNumber };
}

module.exports = { getHotelInfo };
