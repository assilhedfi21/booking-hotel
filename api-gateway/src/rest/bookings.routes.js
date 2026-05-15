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

router.get("/", handle((req) => {
  const { limit = 50, offset = 0, user_email } = req.query;
  if (user_email) return call(bookingClient, "ListBookingsByUser", { user_email });
  return call(bookingClient, "ListBookings", { limit: Number(limit), offset: Number(offset) });
}));

router.post("/", handle(async (req) => {
  // The gateway enriches the booking request with the room price
  // by calling the hotel-service synchronously over gRPC.
  const { room_id } = req.body;
  if (!room_id) throw new Error("room_id is required");
  const room = await call(hotelClient, "GetRoom", { id: room_id });
  if (!room.available) throw new Error("Room is not available");
  return call(bookingClient, "CreateBooking", {
    ...req.body,
    price_per_night: room.price_per_night
  });
}));

router.get("/:id", handle((req) => call(bookingClient, "GetBooking", { id: req.params.id })));

router.post("/:id/cancel", handle((req) =>
  call(bookingClient, "CancelBooking", { id: req.params.id })
));

module.exports = router;
