const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "hotel.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS hotels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    description TEXT,
    stars INTEGER DEFAULT 3,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    number TEXT NOT NULL,
    type TEXT NOT NULL,
    price_per_night REAL NOT NULL,
    capacity INTEGER NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
  );
`);

// Seed a few hotels on first run so the demo has data immediately.
const count = db.prepare("SELECT COUNT(*) as c FROM hotels").get().c;
if (count === 0) {
  const insertHotel = db.prepare(
    "INSERT INTO hotels (id, name, city, country, description, stars, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertRoom = db.prepare(
    "INSERT INTO rooms (id, hotel_id, number, type, price_per_night, capacity, available) VALUES (?, ?, ?, ?, ?, ?, 1)"
  );

  const now = new Date().toISOString();
  const seed = [
    {
      id: "h-001",
      name: "Laico Tunis",
      city: "Tunis",
      country: "Tunisia",
      description: "Luxury hotel in the heart of Tunis.",
      stars: 5,
      rooms: [
        { id: "r-001", number: "101", type: "DOUBLE", price: 120, capacity: 2 },
        { id: "r-002", number: "102", type: "SUITE", price: 250, capacity: 4 }
      ]
    },
    {
      id: "h-002",
      name: "Hasdrubal Hammamet",
      city: "Hammamet",
      country: "Tunisia",
      description: "Beach resort with sea view.",
      stars: 4,
      rooms: [
        { id: "r-003", number: "201", type: "SINGLE", price: 70, capacity: 1 },
        { id: "r-004", number: "202", type: "DOUBLE", price: 110, capacity: 2 }
      ]
    },
    {
      id: "h-003",
      name: "Movenpick Sousse",
      city: "Sousse",
      country: "Tunisia",
      description: "Family-friendly hotel near the Medina.",
      stars: 4,
      rooms: [
        { id: "r-005", number: "301", type: "FAMILY", price: 180, capacity: 4 }
      ]
    }
  ];

  const tx = db.transaction(() => {
    for (const h of seed) {
      insertHotel.run(h.id, h.name, h.city, h.country, h.description, h.stars, now);
      for (const r of h.rooms) {
        insertRoom.run(r.id, h.id, r.number, r.type, r.price, r.capacity);
      }
    }
  });
  tx();
}

module.exports = db;
