// Optional standalone server for the web client.
// In normal usage the API Gateway already serves /client/public,
// so you can just open http://localhost:4000 once the gateway is up.

const path = require("path");
const express = require("express");

const PORT = process.env.CLIENT_PORT || 3000;
const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`[client] static server -> http://localhost:${PORT}`);
});
