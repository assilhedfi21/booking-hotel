const { Router } = require("express");
const { bookingClient, hotelClient, call } = require("../grpc/clients");

const router = Router();

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json(data);
  } catch (err) {
    res.status(err.code === 5 ? 404 : 400).json({ error: err.message || "gRPC error" });
  }
};

// Enrich a booking with the hotel name and room number by calling
// hotel-service over gRPC. Best effort: if anything fails we still
// return the booking with the raw IDs.
async function enrichBooking(booking) {
  if (!booking) return booking;
  const enriched = { ...booking };

  try {
    const hotel = await call(hotelClient, "GetHotel", { id: booking.hotel_id });
    enriched.hotel_name = hotel.name;
    enriched.hotel_city = hotel.city;
    enriched.hotel_stars = hotel.stars;
  } catch (_) {
    enriched.hotel_name = booking.hotel_id;
  }

  try {
    const room = await call(hotelClient, "GetRoom", { id: booking.room_id });
    enriched.room_number = room.number;
    enriched.room_type = room.type;
  } catch (_) {
    enriched.room_number = booking.room_id;
  }

  return enriched;
}

async function enrichList(response) {
  const bookings = await Promise.all((response.bookings || []).map(enrichBooking));
  return { ...response, bookings };
}

router.get("/", handle(async (req) => {
  const { limit = 50, offset = 0, user_email } = req.query;
  const list = user_email
    ? await call(bookingClient, "ListBookingsByUser", { user_email })
    : await call(bookingClient, "ListBookings", {
        limit: Number(limit),
        offset: Number(offset)
      });
  return enrichList(list);
}));

router.post("/", handle(async (req) => {
  // The gateway enriches the booking request with the room price
  // by calling the hotel-service synchronously over gRPC.
  const { room_id } = req.body;
  if (!room_id) throw new Error("room_id is required");
  const room = await call(hotelClient, "GetRoom", { id: room_id });
  if (!room.available) throw new Error("Room is not available");
  const booking = await call(bookingClient, "CreateBooking", {
    ...req.body,
    price_per_night: room.price_per_night
  });
  return enrichBooking(booking);
}));

router.get("/:id", handle(async (req) => {
  const booking = await call(bookingClient, "GetBooking", { id: req.params.id });
  return enrichBooking(booking);
}));

router.post("/:id/cancel", handle(async (req) => {
  const booking = await call(bookingClient, "CancelBooking", { id: req.params.id });
  return enrichBooking(booking);
}));

module.exports = router;
