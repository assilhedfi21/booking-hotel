FROM node:22.13-alpine

WORKDIR /app

COPY services/booking-service/package.json ./services/booking-service/package.json
COPY package.json ./package.json

RUN cd services/booking-service && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto
COPY services/booking-service/src ./services/booking-service/src

ENV BOOKING_GRPC_PORT=50052
ENV KAFKA_BROKER=kafka:9092

EXPOSE 50052
CMD ["node", "services/booking-service/src/index.js"]
