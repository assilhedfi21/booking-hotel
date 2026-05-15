# API reference

## What's new (v1.2.0)

- **10 Tunisian hotels** are now seeded automatically on first run (Tunis, Hammamet, Sousse, Monastir, Nefta, Carthage, Djerba, Tabarka).
- **Booking responses are enriched**: every booking now includes `hotel_name`, `hotel_city`, `hotel_stars`, `room_number` and `room_type` resolved by the gateway through gRPC calls to the hotel-service.
- **Notifications are richer**: when the notification-service receives a `booking.created` or `booking.cancelled` event from Kafka, it fetches the hotel name and room number through gRPC so the message is human-readable (e.g. "Your booking at Four Seasons Tunis (room 401) has been cancelled.").

## REST examples (curl)

### List hotels
```bash
curl http://localhost:4000/api/hotels
```

### Search hotels
```bash
curl "http://localhost:4000/api/hotels?city=Tunis&min_stars=4"
```

### Create a hotel
```bash
curl -X POST http://localhost:4000/api/hotels \
  -H "Content-Type: application/json" \
  -d '{"name":"Royal Hammamet","city":"Hammamet","country":"Tunisia","stars":5}'
```

### List rooms of a hotel
```bash
curl http://localhost:4000/api/hotels/h-001/rooms
```

### Add a room
```bash
curl -X POST http://localhost:4000/api/hotels/h-001/rooms \
  -H "Content-Type: application/json" \
  -d '{"number":"103","type":"DOUBLE","price_per_night":140,"capacity":2}'
```

### Create a booking
```bash
curl -X POST http://localhost:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_email":"alice@example.com",
    "user_name":"Alice",
    "hotel_id":"h-001",
    "room_id":"r-001",
    "check_in":"2026-06-10",
    "check_out":"2026-06-13"
  }'
```

### Cancel a booking
```bash
curl -X POST http://localhost:4000/api/bookings/{id}/cancel
```

### List my notifications
```bash
curl "http://localhost:4000/api/notifications?user_email=alice@example.com"
```

---

## GraphQL examples

### A simple cross-service query

```graphql
{
  bookings {
    id
    status
    total_price
    hotel { name city stars }
    room  { number type price_per_night }
  }
}
```

### Search hotels with their rooms

```graphql
{
  searchHotels(city: "Tunis", minStars: 4) {
    id
    name
    stars
    rooms { id number price_per_night available }
  }
}
```

### Create a booking via mutation

```graphql
mutation {
  createBooking(input: {
    userEmail: "alice@example.com"
    userName: "Alice"
    hotelId: "h-001"
    roomId: "r-001"
    checkIn: "2026-06-10"
    checkOut: "2026-06-13"
  }) {
    id
    nights
    total_price
    status
  }
}
```

---

## gRPC

You can call the services directly with `grpcurl`:

```bash
grpcurl -plaintext -import-path ./proto -proto hotel.proto \
  localhost:50051 hotel.HotelService/ListHotels
```

```bash
grpcurl -plaintext -import-path ./proto -proto booking.proto \
  -d '{"user_email":"a@b.c","user_name":"A","hotel_id":"h-001","room_id":"r-001","check_in":"2026-06-10","check_out":"2026-06-13","price_per_night":120}' \
  localhost:50052 booking.BookingService/CreateBooking
```
