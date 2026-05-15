const { Router } = require("express");
const { notificationClient, call } = require("../grpc/clients");

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
  const { user_email, limit = 50 } = req.query;
  if (user_email) {
    return call(notificationClient, "GetNotificationsByUser", { user_email });
  }
  return call(notificationClient, "ListNotifications", { limit: Number(limit) });
}));

router.post("/:id/read", handle((req) =>
  call(notificationClient, "MarkAsRead", { id: req.params.id })
));

module.exports = router;
