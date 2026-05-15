const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");

const { typeDefs } = require("./graphql/schema");
const { resolvers } = require("./graphql/resolvers");

const hotelsRoutes = require("./rest/hotels.routes");
const bookingsRoutes = require("./rest/bookings.routes");
const notificationsRoutes = require("./rest/notifications.routes");

const PORT = process.env.GATEWAY_PORT || 4000;

async function main() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  // Static demo client served by the gateway for convenience.
  const clientDir = process.env.CLIENT_DIR || path.resolve(__dirname, "..", "..", "client", "public");
  app.use(express.static(clientDir));

  // REST API
  app.use("/api/hotels", hotelsRoutes);
  app.use("/api/bookings", bookingsRoutes);
  app.use("/api/notifications", notificationsRoutes);

  app.get("/api/health", (_, res) => res.json({ status: "ok", service: "api-gateway" }));

  // GraphQL via Apollo Server
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use("/graphql", expressMiddleware(apollo));

  app.listen(PORT, () => {
    console.log(`[api-gateway] REST   -> http://localhost:${PORT}/api`);
    console.log(`[api-gateway] GraphQL -> http://localhost:${PORT}/graphql`);
    console.log(`[api-gateway] Client  -> http://localhost:${PORT}/`);
  });
}

main().catch((err) => {
  console.error("[api-gateway] fatal:", err);
  process.exit(1);
});
