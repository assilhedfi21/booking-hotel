const { v4: uuid } = require("uuid");
const db = require("./db");

const rowToHotel = (row) =>
  row && {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    description: row.description || "",
    stars: row.stars || 0,
    created_at: row.created_at
  };

const rowToRoom = (row) =>
  row && {
    id: row.id,
    hotel_id: row.hotel_id,
    number: row.number,
    type: row.type,
    price_per_night: row.price_per_night,
    capacity: row.capacity,
    available: !!row.available
  };

const HotelRepo = {
  create({ name, city, country, description, stars }) {
    const id = `h-${uuid().slice(0, 8)}`;
    const created_at = new Date().toISOString();
    db.prepare(
      "INSERT INTO hotels (id, name, city, country, description, stars, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, name, city, country, description || "", stars || 3, created_at);
    return this.findById(id);
  },

  update(id, { name, city, country, description, stars }) {
    const existing = this.findById(id);
    if (!existing) return null;
    db.prepare(
      "UPDATE hotels SET name = ?, city = ?, country = ?, description = ?, stars = ? WHERE id = ?"
    ).run(
      name ?? existing.name,
      city ?? existing.city,
      country ?? existing.country,
      description ?? existing.description,
      stars ?? existing.stars,
      id
    );
    return this.findById(id);
  },

  delete(id) {
    const result = db.prepare("DELETE FROM hotels WHERE id = ?").run(id);
    return result.changes > 0;
  },

  findById(id) {
    return rowToHotel(db.prepare("SELECT * FROM hotels WHERE id = ?").get(id));
  },

  list({ limit = 50, offset = 0 } = {}) {
    const rows = db
      .prepare("SELECT * FROM hotels ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset);
    const total = db.prepare("SELECT COUNT(*) as c FROM hotels").get().c;
    return { hotels: rows.map(rowToHotel), total };
  },

  search({ city, min_stars }) {
    const rows = db
      .prepare(
        "SELECT * FROM hotels WHERE (? = '' OR LOWER(city) LIKE LOWER(?)) AND stars >= ? ORDER BY stars DESC"
      )
      .all(city || "", `%${city || ""}%`, min_stars || 0);
    return { hotels: rows.map(rowToHotel), total: rows.length };
  }
};

const RoomRepo = {
  add({ hotel_id, number, type, price_per_night, capacity }) {
    if (!HotelRepo.findById(hotel_id)) return null;
    const id = `r-${uuid().slice(0, 8)}`;
    db.prepare(
      "INSERT INTO rooms (id, hotel_id, number, type, price_per_night, capacity, available) VALUES (?, ?, ?, ?, ?, ?, 1)"
    ).run(id, hotel_id, number, type, price_per_night, capacity);
    return this.findById(id);
  },

  findById(id) {
    return rowToRoom(db.prepare("SELECT * FROM rooms WHERE id = ?").get(id));
  },

  listByHotel(hotel_id) {
    const rows = db
      .prepare("SELECT * FROM rooms WHERE hotel_id = ? ORDER BY number ASC")
      .all(hotel_id);
    return rows.map(rowToRoom);
  },

  setAvailability(id, available) {
    const existing = this.findById(id);
    if (!existing) return null;
    db.prepare("UPDATE rooms SET available = ? WHERE id = ?").run(available ? 1 : 0, id);
    return this.findById(id);
  }
};

module.exports = { HotelRepo, RoomRepo };
