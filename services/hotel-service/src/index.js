const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const { HotelRepo, RoomRepo } = require("./repository");
const { startKafka, stopKafka } = require("./kafka");

const PROTO_PATH = path.resolve(__dirname, "..", "..", "..", "proto", "hotel.proto");
const PORT = process.env.HOTEL_GRPC_PORT || 50051;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const hotelProto = grpc.loadPackageDefinition(packageDefinition).hotel;

const handlers = {
  CreateHotel(call, callback) {
    try {
      const hotel = HotelRepo.create(call.request);
      callback(null, hotel);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  GetHotel(call, callback) {
    const hotel = HotelRepo.findById(call.request.id);
    if (!hotel) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Hotel not found" });
    }
    callback(null, hotel);
  },

  ListHotels(call, callback) {
    callback(null, HotelRepo.list(call.request));
  },

  UpdateHotel(call, callback) {
    const hotel = HotelRepo.update(call.request.id, call.request);
    if (!hotel) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Hotel not found" });
    }
    callback(null, hotel);
  },

  DeleteHotel(call, callback) {
    const success = HotelRepo.delete(call.request.id);
    callback(null, { success });
  },

  SearchHotels(call, callback) {
    callback(null, HotelRepo.search(call.request));
  },

  AddRoom(call, callback) {
    const room = RoomRepo.add(call.request);
    if (!room) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Hotel not found" });
    }
    callback(null, room);
  },

  GetRoom(call, callback) {
    const room = RoomRepo.findById(call.request.id);
    if (!room) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Room not found" });
    }
    callback(null, room);
  },

  ListRooms(call, callback) {
    const rooms = RoomRepo.listByHotel(call.request.hotel_id);
    callback(null, { rooms });
  },

  SetRoomAvailability(call, callback) {
    const room = RoomRepo.setAvailability(call.request.id, call.request.available);
    if (!room) {
      return callback({ code: grpc.status.NOT_FOUND, message: "Room not found" });
    }
    callback(null, room);
  }
};

function main() {
  const server = new grpc.Server();
  server.addService(hotelProto.HotelService.service, handlers);
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error("[hotel-service] failed to bind:", err);
      process.exit(1);
    }
    console.log(`[hotel-service] gRPC server listening on port ${port}`);
    startKafka();
  });

  process.on("SIGINT", async () => {
    await stopKafka();
    server.tryShutdown(() => process.exit(0));
  });
}

main();
