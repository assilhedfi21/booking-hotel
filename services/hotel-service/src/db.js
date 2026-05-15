const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "hotel.db"));
db.exec("PRAGMA journal_mode = WAL;");

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

// Seed when the DB is empty so the demo has data immediately. The check
// only runs when there are no hotels at all, so users can add or remove
// hotels at runtime without seeing them re-created.
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
      description: "Luxury 5-star hotel in the heart of Tunis with rooftop pool and spa.",
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
      description: "Beach resort with private sandy beach and sea-view rooms.",
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
      description: "Family-friendly hotel near the Medina with kids club and pool.",
      stars: 4,
      rooms: [
        { id: "r-005", number: "301", type: "FAMILY", price: 180, capacity: 4 },
        { id: "r-006", number: "302", type: "DOUBLE", price: 95, capacity: 2 }
      ]
    },
    {
      id: "h-004",
      name: "Four Seasons Tunis",
      city: "Tunis",
      country: "Tunisia",
      description: "Premium beachfront 5-star hotel in Gammarth with spa and gourmet dining.",
      stars: 5,
      rooms: [
        { id: "r-007", number: "401", type: "DELUXE", price: 320, capacity: 2 },
        { id: "r-008", number: "402", type: "SUITE", price: 480, capacity: 3 },
        { id: "r-009", number: "403", type: "PRESIDENTIAL", price: 950, capacity: 4 }
      ]
    },
    {
      id: "h-005",
      name: "Diar Lemdina",
      city: "Hammamet",
      country: "Tunisia",
      description: "Andalusian-style 4-star resort surrounded by gardens.",
      stars: 4,
      rooms: [
        { id: "r-010", number: "501", type: "DOUBLE", price: 90, capacity: 2 },
        { id: "r-011", number: "502", type: "FAMILY", price: 150, capacity: 4 }
      ]
    },
    {
      id: "h-006",
      name: "Royal Thalassa Monastir",
      city: "Monastir",
      country: "Tunisia",
      description: "Thalassotherapy resort with wellness center and 3 pools.",
      stars: 5,
      rooms: [
        { id: "r-012", number: "601", type: "DOUBLE", price: 140, capacity: 2 },
        { id: "r-013", number: "602", type: "SUITE", price: 290, capacity: 4 }
      ]
    },
    {
      id: "h-007",
      name: "Dar Hi",
      city: "Nefta",
      country: "Tunisia",
      description: "Boutique eco-lodge in the Sahara desert oasis with stargazing terrace.",
      stars: 4,
      rooms: [
        { id: "r-014", number: "701", type: "DOUBLE", price: 160, capacity: 2 },
        { id: "r-015", number: "702", type: "FAMILY", price: 220, capacity: 4 }
      ]
    },
    {
      id: "h-008",
      name: "Hotel Carthage Thalasso",
      city: "Carthage",
      country: "Tunisia",
      description: "3-star comfortable hotel near the historical Carthage ruins.",
      stars: 3,
      rooms: [
        { id: "r-016", number: "801", type: "SINGLE", price: 55, capacity: 1 },
        { id: "r-017", number: "802", type: "DOUBLE", price: 80, capacity: 2 }
      ]
    },
    {
      id: "h-009",
      name: "Sangho Djerba",
      city: "Djerba",
      country: "Tunisia",
      description: "Island resort on the famous Djerba beaches with all-inclusive option.",
      stars: 4,
      rooms: [
        { id: "r-018", number: "901", type: "DOUBLE", price: 100, capacity: 2 },
        { id: "r-019", number: "902", type: "SUITE", price: 200, capacity: 3 },
        { id: "r-020", number: "903", type: "FAMILY", price: 175, capacity: 5 }
      ]
    },
    {
      id: "h-010",
      name: "Tabarka Beach Resort",
      city: "Tabarka",
      country: "Tunisia",
      description: "Quiet 3-star resort between mountains and sea, ideal for nature lovers.",
      stars: 3,
      rooms: [
        { id: "r-021", number: "1001", type: "SINGLE", price: 60, capacity: 1 },
        { id: "r-022", number: "1002", type: "DOUBLE", price: 85, capacity: 2 }
      ]
    }
  ];

  db.exec("BEGIN");
  try {
    for (const h of seed) {
      insertHotel.run(h.id, h.name, h.city, h.country, h.description, h.stars, now);
      for (const r of h.rooms) {
        insertRoom.run(r.id, h.id, r.number, r.type, r.price, r.capacity);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

module.exports = db;
