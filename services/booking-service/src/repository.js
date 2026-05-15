const { v4: uuid } = require("uuid");
const db = require("./db");

const rowToBooking = (row) =>
  row && {
    id: row.id,
    user_email: row.user_email,
    user_name: row.user_name,
    hotel_id: row.hotel_id,
    room_id: row.room_id,
    check_in: row.check_in,
    check_out: row.check_out,
    nights: row.nights,
    total_price: row.total_price,
    status: row.status,
    created_at: row.created_at
  };

function diffNights(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

const BookingRepo = {
  create({ user_email, user_name, hotel_id, room_id, check_in, check_out, price_per_night }) {
    const id = `b-${uuid().slice(0, 8)}`;
    const nights = diffNights(check_in, check_out);
    const total_price = nights * (price_per_night || 0);
    const created_at = new Date().toISOString();

    db.prepare(
      `INSERT INTO bookings
        (id, user_email, user_name, hotel_id, room_id, check_in, check_out, nights, total_price, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)`
    ).run(id, user_email, user_name, hotel_id, room_id, check_in, check_out, nights, total_price, created_at);

    return this.findById(id);
  },

  findById(id) {
    return rowToBooking(db.prepare("SELECT * FROM bookings WHERE id = ?").get(id));
  },

  list({ limit = 50, offset = 0 } = {}) {
    const rows = db
      .prepare("SELECT * FROM bookings ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset);
    const total = db.prepare("SELECT COUNT(*) as c FROM bookings").get().c;
    return { bookings: rows.map(rowToBooking), total };
  },

  listByUser(user_email) {
    const rows = db
      .prepare("SELECT * FROM bookings WHERE user_email = ? ORDER BY created_at DESC")
      .all(user_email);
    return { bookings: rows.map(rowToBooking), total: rows.length };
  },

  cancel(id) {
    const existing = this.findById(id);
    if (!existing) return null;
    if (existing.status === "CANCELLED") return existing;
    db.prepare("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?").run(id);
    return this.findById(id);
  }
};

module.exports = { BookingRepo };
