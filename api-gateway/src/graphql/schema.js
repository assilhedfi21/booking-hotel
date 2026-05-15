const gql = require("graphql-tag");

const typeDefs = gql`
  type Hotel {
    id: ID!
    name: String!
    city: String!
    country: String!
    description: String
    stars: Int
    created_at: String
    rooms: [Room!]!
  }

  type Room {
    id: ID!
    hotel_id: ID!
    number: String!
    type: String!
    price_per_night: Float!
    capacity: Int!
    available: Boolean!
    hotel: Hotel
  }

  type Booking {
    id: ID!
    user_email: String!
    user_name: String!
    hotel_id: ID!
    room_id: ID!
    check_in: String!
    check_out: String!
    nights: Int!
    total_price: Float!
    status: String!
    created_at: String
    hotel: Hotel
    room: Room
  }

  type Notification {
    id: ID!
    user_email: String!
    type: String!
    title: String!
    message: String!
    related_id: String
    read: Boolean!
    created_at: String
  }

  type DeleteResponse { success: Boolean! }

  type Query {
    hotels(limit: Int, offset: Int): [Hotel!]!
    hotel(id: ID!): Hotel
    searchHotels(city: String, minStars: Int): [Hotel!]!
    rooms(hotelId: ID!): [Room!]!

    bookings(limit: Int, offset: Int): [Booking!]!
    booking(id: ID!): Booking
    bookingsByUser(userEmail: String!): [Booking!]!

    notifications(limit: Int): [Notification!]!
    notificationsByUser(userEmail: String!): [Notification!]!
  }

  input CreateHotelInput {
    name: String!
    city: String!
    country: String!
    description: String
    stars: Int
  }

  input AddRoomInput {
    hotelId: ID!
    number: String!
    type: String!
    pricePerNight: Float!
    capacity: Int!
  }

  input CreateBookingInput {
    userEmail: String!
    userName: String!
    hotelId: ID!
    roomId: ID!
    checkIn: String!
    checkOut: String!
  }

  type Mutation {
    createHotel(input: CreateHotelInput!): Hotel!
    deleteHotel(id: ID!): DeleteResponse!
    addRoom(input: AddRoomInput!): Room!

    createBooking(input: CreateBookingInput!): Booking!
    cancelBooking(id: ID!): Booking!

    markNotificationAsRead(id: ID!): Notification!
  }
`;

module.exports = { typeDefs };
