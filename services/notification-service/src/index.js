const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const { initDb } = require("./db");
const { NotificationRepo } = require("./repository");
const { startKafka, stopKafka } = require("./kafka");

const PROTO_DIR = process.env.PROTO_DIR || path.resolve(__dirname, "..", "..", "..", "proto");
const PROTO_PATH = path.join(PROTO_DIR, "notification.proto");
const PORT = process.env.NOTIFICATION_GRPC_PORT || 50053;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

const handlers = {
  async CreateNotification(call, callback) {
    try {
      const { user_email, type, title, message, related_id } = call.request;
      const n = await NotificationRepo.create({ user_email, type, title, message, related_id });
      callback(null, n);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  async ListNotifications(call, callback) {
    try {
      callback(null, await NotificationRepo.list(call.request));
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  async GetNotificationsByUser(call, callback) {
    try {
      callback(null, await NotificationRepo.listByUser(call.request.user_email));
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  async MarkAsRead(call, callback) {
    try {
      const n = await NotificationRepo.markAsRead(call.request.id);
      if (!n) {
        return callback({ code: grpc.status.NOT_FOUND, message: "Notification not found" });
      }
      callback(null, n);
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  }
};

async function main() {
  await initDb();

  const server = new grpc.Server();
  server.addService(notificationProto.NotificationService.service, handlers);
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error("[notification-service] failed to bind:", err);
      process.exit(1);
    }
    console.log(`[notification-service] gRPC server listening on port ${port}`);
    startKafka();
  });

  process.on("SIGINT", async () => {
    await stopKafka();
    server.tryShutdown(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("[notification-service] fatal:", err);
  process.exit(1);
});
