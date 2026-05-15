# Architecture details

## Communication matrix

| From → To | Channel | Protocol | Reason |
|-----------|---------|----------|--------|
| Client → API Gateway | HTTP/1.1 | REST + GraphQL (JSON) | Public, browser-friendly |
| API Gateway → Hotel-Service | HTTP/2 | gRPC + Protobuf | Internal, fast, contract-driven |
| API Gateway → Booking-Service | HTTP/2 | gRPC + Protobuf | Internal |
| API Gateway → Notification-Service | HTTP/2 | gRPC + Protobuf | Internal |
| Booking-Service → Kafka | TCP | Kafka protocol | Async event publishing |
| Kafka → Hotel-Service | TCP | Kafka protocol | Update room availability |
| Kafka → Notification-Service | TCP | Kafka protocol | Generate notifications |

## Why this split?

- **REST** is exposed for classic CRUD (well-known, easy to test with `curl`).
- **GraphQL** lets the client compose a single request that joins hotel + room + booking, even though they live in different services. The gateway acts as a federation layer.
- **gRPC** is used internally because:
  - strongly-typed contracts (`.proto`) are checked at compile time;
  - HTTP/2 streams are efficient for service-to-service traffic;
  - it forces clear boundaries between services.
- **Kafka** is used for **events**, not RPC. The booking service does not need to know who reacts to `booking.created`. New consumers can be added without touching the producer.

## Failure handling

- **Kafka unavailable:** every service catches the connection error, logs a warning and starts anyway. Sync gRPC calls keep working; only the async chain is paused.
- **gRPC NOT_FOUND:** translated to HTTP 404 by the gateway.
- **gRPC INVALID_ARGUMENT / INTERNAL:** translated to HTTP 400.

## Ports

| Component | Port |
|-----------|------|
| API Gateway (HTTP) | `4000` |
| Hotel-Service (gRPC) | `50051` |
| Booking-Service (gRPC) | `50052` |
| Notification-Service (gRPC) | `50053` |
| Kafka (external listener) | `9094` |
| Kafka UI | `8080` |

## Why npm workspaces?

The four packages share `proto/` and need consistent dependency versions
(especially `@grpc/grpc-js` and `@grpc/proto-loader`). npm workspaces give us
**one `npm install`** at the root and a single `node_modules`, which keeps the
project beginner-friendly while remaining production-shaped.
