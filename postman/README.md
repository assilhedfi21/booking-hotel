# Postman collection

This folder contains a ready-to-import Postman collection covering every REST and
GraphQL endpoint of the project.

## Files

- `Hotel-Booking-Microservices.postman_collection.json` — the collection
- `Hotel-Booking.postman_environment.json` — local environment (variables)

## How to import

1. Open Postman.
2. Click **Import** → **File** → select both JSON files.
3. In the top-right environment selector, choose **Hotel Booking - Local**.
4. Make sure the stack is running: `docker compose up --build` (or the Node scripts).

## Recommended demo order

1. **Health → Gateway health** to check the gateway answers.
2. **Hotels (REST) → List hotels** — see seeded data.
3. **Hotels (REST) → List rooms of a hotel** — uses `{{hotelId}}` (default `h-001`).
4. **Bookings (REST) → Create booking** — the response `id` is automatically saved
   into the `{{bookingId}}` collection variable by a test script.
5. **Bookings (REST) → Get booking by id** — uses the saved id.
6. **Notifications (REST) → List notifications by user** — needs Kafka up; the
   first id is saved into `{{notificationId}}`.
7. **Bookings (REST) → Cancel booking**.
8. **GraphQL → Query - bookings with hotel + room joined** — single query that
   internally calls 3 microservices over gRPC.

## Variables

| Variable | Default | Used by |
|----------|---------|---------|
| `baseUrl` | `http://localhost:4000` | every request |
| `userEmail` | `alice@example.com` | bookings + notifications |
| `userName` | `Alice Tester` | bookings |
| `hotelId` | `h-001` | hotel + room requests |
| `roomId` | `r-001` | bookings |
| `bookingId` | (auto) | get/cancel booking |
| `notificationId` | (auto) | mark as read |
