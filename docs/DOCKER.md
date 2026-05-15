# Running with Docker

The full stack is containerised. From the project root:

```bash
docker compose up --build
```

This starts:

| Container | Port(s) | Role |
|-----------|---------|------|
| `hotel-kafka` | `9092`, `9094` | Kafka broker (KRaft mode, no Zookeeper) |
| `hotel-kafka-ui` | `8080` | Kafka UI to inspect topics and messages |
| `hotel-service` | `50051` | gRPC server + SQLite3 + Kafka consumer |
| `booking-service` | `50052` | gRPC server + SQLite3 + Kafka producer |
| `notification-service` | `50053` | gRPC server + RxDB + Kafka consumer |
| `api-gateway` | `4000` | REST + GraphQL entry point |

Once all containers are healthy, open:

- <http://localhost:4000> — web client
- <http://localhost:4000/graphql> — Apollo studio
- <http://localhost:8080> — Kafka UI

## Stopping

```bash
docker compose down          # keep volumes
docker compose down -v       # also wipe databases and Kafka logs
```

## Rebuilding after code changes

```bash
docker compose up --build
```

The build context is the repository root, so each service's Dockerfile copies
the shared `proto/` directory and only its own `src/` and `package.json`.

## Networking

Inside the compose network the services reach each other by container name:

| From | To | Address |
|------|----|---------|
| `api-gateway` | `hotel-service` | `hotel-service:50051` |
| `api-gateway` | `booking-service` | `booking-service:50052` |
| `api-gateway` | `notification-service` | `notification-service:50053` |
| any service | Kafka | `kafka:9092` |

From the host, the services are still reachable on `localhost` thanks to the
port mappings declared in `docker-compose.yml`.

## Troubleshooting

- **Kafka not healthy:** the broker can take 20–30 s to become healthy on first
  start. Services have `depends_on: { kafka: { condition: service_healthy } }`
  and will wait.
- **Image pull errors:** make sure Docker Desktop is running and you have a
  working internet connection. The first build pulls Node 22 alpine and the
  Kafka image (~ 600 MB total).
- **Port already in use:** stop any local Node service still bound to 4000,
  50051, 50052, 50053, 9092, 9094 or 8080 before running `docker compose up`.
