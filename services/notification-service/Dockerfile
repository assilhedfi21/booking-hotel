FROM node:22.13-alpine

WORKDIR /app

COPY services/notification-service/package.json ./services/notification-service/package.json
COPY package.json ./package.json

RUN cd services/notification-service && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto
COPY services/notification-service/src ./services/notification-service/src

ENV NOTIFICATION_GRPC_PORT=50053
ENV KAFKA_BROKER=kafka:9092

EXPOSE 50053
CMD ["node", "services/notification-service/src/index.js"]
