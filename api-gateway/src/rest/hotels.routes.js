const { Router } = require("express");
const { hotelClient, call } = require("../grpc/clients");

const router = Router();

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json(data);
  } catch (err) {
    res.status(err.code === 5 ? 404 : 400).json({ error: err.message || "gRPC error" });
  }
};

// Hotels CRUD
router.get("/", handle(async (req) => {
  const { limit = 50, offset = 0, city, min_stars } = req.query;
  if (city || min_stars) {
    return call(hotelClient, "SearchHotels", {
      city: city || "",
      min_stars: Number(min_stars) || 0
    });
  }
  return call(hotelClient, "ListHotels", { limit: Number(limit), offset: Number(offset) });
}));

router.post("/", handle((req) => call(hotelClient, "CreateHotel", req.body)));

router.get("/:id", handle((req) => call(hotelClient, "GetHotel", { id: req.params.id })));

router.put("/:id", handle((req) =>
  call(hotelClient, "UpdateHotel", { id: req.params.id, ...req.body })
));

router.delete("/:id", handle((req) =>
  call(hotelClient, "DeleteHotel", { id: req.params.id })
));

// Rooms (nested)
router.get("/:id/rooms", handle((req) =>
  call(hotelClient, "ListRooms", { hotel_id: req.params.id })
));

router.post("/:id/rooms", handle((req) =>
  call(hotelClient, "AddRoom", { hotel_id: req.params.id, ...req.body })
));

module.exports = router;
