const path = require("path");
const fs = require("fs");
const { createRxDatabase, addRxPlugin } = require("rxdb");
const { getRxStorageMemory } = require("rxdb/plugins/storage-memory");
const { RxDBDevModePlugin } = require("rxdb/plugins/dev-mode");
const { RxDBJsonDumpPlugin } = require("rxdb/plugins/json-dump");

if (process.env.NODE_ENV !== "production") {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBJsonDumpPlugin);

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dumpFile = path.join(dataDir, "notifications.json");

const notificationSchema = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 64 },
    user_email: { type: "string", maxLength: 256 },
    type: { type: "string", maxLength: 64 },
    title: { type: "string" },
    message: { type: "string" },
    related_id: { type: "string" },
    read: { type: "boolean" },
    created_at: { type: "string" }
  },
  required: ["id", "user_email", "type", "title", "message", "created_at"]
};

let db = null;

async function initDb() {
  if (db) return db;

  db = await createRxDatabase({
    name: "notificationdb",
    storage: getRxStorageMemory(),
    ignoreDuplicate: true
  });

  await db.addCollections({
    notifications: { schema: notificationSchema }
  });

  // Restore previous state from JSON dump if exists.
  if (fs.existsSync(dumpFile)) {
    try {
      const dump = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
      await db.importJSON(dump);
      console.log("[notification-service] restored RxDB dump");
    } catch (err) {
      console.warn("[notification-service] could not restore dump:", err.message);
    }
  }

  // Persist on any change.
  db.notifications.$.subscribe(() => {
    persist().catch(() => {});
  });

  return db;
}

async function persist() {
  if (!db) return;
  const dump = await db.exportJSON();
  fs.writeFileSync(dumpFile, JSON.stringify(dump, null, 2));
}

function getDb() {
  if (!db) throw new Error("RxDB not initialized");
  return db;
}

module.exports = { initDb, getDb, persist };
