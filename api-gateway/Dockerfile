FROM node:22.13-alpine

WORKDIR /app

COPY api-gateway/package.json ./api-gateway/package.json
COPY package.json ./package.json

RUN cd api-gateway && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto
COPY api-gateway/src ./api-gateway/src
COPY client ./client

ENV GATEWAY_PORT=4000
ENV HOTEL_GRPC_TARGET=hotel-service:50051
ENV BOOKING_GRPC_TARGET=booking-service:50052
ENV NOTIFICATION_GRPC_TARGET=notification-service:50053

EXPOSE 4000
CMD ["node", "api-gateway/src/index.js"]
