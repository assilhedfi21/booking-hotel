# Multi-stage Dockerfile for all services.
# Usage:
#   docker build --target hotel-service -t hotel-service .
#   docker build --target booking-service -t booking-service .
#   docker build --target notification-service -t notification-service .
#   docker build --target api-gateway -t api-gateway .
#
# docker-compose.yml uses the `target` field to select the stage.

# ─── Base ────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# ─── Hotel Service ───────────────────────────────────────────────
FROM base AS hotel-service
COPY services/hotel-service/package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY proto/ proto/
COPY services/hotel-service/src/ src/
ENV HOTEL_GRPC_PORT=50051
ENV KAFKA_BROKER=kafka:9092
ENV PROTO_DIR=/app/proto
EXPOSE 50051
CMD ["node", "src/index.js"]

# ─── Booking Service ─────────────────────────────────────────────
FROM base AS booking-service
COPY services/booking-service/package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY proto/ proto/
COPY services/booking-service/src/ src/
ENV BOOKING_GRPC_PORT=50052
ENV KAFKA_BROKER=kafka:9092
ENV PROTO_DIR=/app/proto
EXPOSE 50052
CMD ["node", "src/index.js"]

# ─── Notification Service ────────────────────────────────────────
FROM base AS notification-service
COPY services/notification-service/package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY proto/ proto/
COPY services/notification-service/src/ src/
ENV NOTIFICATION_GRPC_PORT=50053
ENV KAFKA_BROKER=kafka:9092
ENV HOTEL_GRPC_TARGET=hotel-service:50051
ENV PROTO_DIR=/app/proto
EXPOSE 50053
CMD ["node", "src/index.js"]

# ─── API Gateway ─────────────────────────────────────────────────
FROM base AS api-gateway
COPY api-gateway/package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY proto/ proto/
COPY api-gateway/src/ src/
COPY client/public/ client/public/
ENV GATEWAY_PORT=4000
ENV HOTEL_GRPC_TARGET=hotel-service:50051
ENV BOOKING_GRPC_TARGET=booking-service:50052
ENV NOTIFICATION_GRPC_TARGET=notification-service:50053
ENV PROTO_DIR=/app/proto
ENV CLIENT_DIR=/app/client/public
EXPOSE 4000
CMD ["node", "src/index.js"]
