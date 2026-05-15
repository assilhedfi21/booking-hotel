FROM node:22.13-alpine

WORKDIR /app

# Install only this service's dependencies (no native build needed
# because we use the built-in node:sqlite module).
COPY services/hotel-service/package.json ./services/hotel-service/package.json
COPY package.json ./package.json

RUN cd services/hotel-service && npm install --omit=dev --no-audit --no-fund

# Copy source and shared proto contracts.
COPY proto ./proto
COPY services/hotel-service/src ./services/hotel-service/src

ENV HOTEL_GRPC_PORT=50051
ENV KAFKA_BROKER=kafka:9092

EXPOSE 50051
CMD ["node", "services/hotel-service/src/index.js"]
