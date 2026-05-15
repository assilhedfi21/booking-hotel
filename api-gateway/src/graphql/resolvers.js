const {
  hotelClient,
  bookingClient,
  notificationClient,
  call
} = require("../grpc/clients");

const resolvers = {
  Query: {
    hotels: async (_, { limit = 50, offset = 0 }) => {
      const res = await call(hotelClient, "ListHotels", { limit, offset });
      return res.hotels;
    },
    hotel: async (_, { id }) => {
      try { return await call(hotelClient, "GetHotel", { id }); }
      catch { return null; }
    },
    searchHotels: async (_, { city, minStars }) => {
      const res = await call(hotelClient, "SearchHotels", {
        city: city || "",
        min_stars: minStars || 0
      });
      return res.hotels;
    },
    rooms: async (_, { hotelId }) => {
      const res = await call(hotelClient, "ListRooms", { hotel_id: hotelId });
      return res.rooms;
    },

    bookings: async (_, { limit = 50, offset = 0 }) => {
      const res = await call(bookingClient, "ListBookings", { limit, offset });
      return res.bookings;
    },
    booking: async (_, { id }) => {
      try { return await call(bookingClient, "GetBooking", { id }); }
      catch { return null; }
    },
    bookingsByUser: async (_, { userEmail }) => {
      const res = await call(bookingClient, "ListBookingsByUser", { user_email: userEmail });
      return res.bookings;
    },

    notifications: async (_, { limit = 50 }) => {
      const res = await call(notificationClient, "ListNotifications", { limit });
      return res.notifications;
    },
    notificationsByUser: async (_, { userEmail }) => {
      const res = await call(notificationClient, "GetNotificationsByUser", { user_email: userEmail });
      return res.notifications;
    }
  },

  Mutation: {
    createHotel: (_, { input }) => call(hotelClient, "CreateHotel", input),
    deleteHotel: (_, { id }) => call(hotelClient, "DeleteHotel", { id }),
    addRoom: (_, { input }) =>
      call(hotelClient, "AddRoom", {
        hotel_id: input.hotelId,
        number: input.number,
        type: input.type,
        price_per_night: input.pricePerNight,
        capacity: input.capacity
      }),

    createBooking: async (_, { input }) => {
      const room = await call(hotelClient, "GetRoom", { id: input.roomId });
      if (!room.available) throw new Error("Room is not available");
      return call(bookingClient, "CreateBooking", {
        user_email: input.userEmail,
        user_name: input.userName,
        hotel_id: input.hotelId,
        room_id: input.roomId,
        check_in: input.checkIn,
        check_out: input.checkOut,
        price_per_night: room.price_per_night
      });
    },
    cancelBooking: (_, { id }) => call(bookingClient, "CancelBooking", { id }),

    markNotificationAsRead: (_, { id }) =>
      call(notificationClient, "MarkAsRead", { id })
  },

  Hotel: {
    rooms: async (parent) => {
      const res = await call(hotelClient, "ListRooms", { hotel_id: parent.id });
      return res.rooms;
    }
  },

  Room: {
    hotel: async (parent) => {
      try { return await call(hotelClient, "GetHotel", { id: parent.hotel_id }); }
      catch { return null; }
    }
  },

  Booking: {
    hotel: async (parent) => {
      try { return await call(hotelClient, "GetHotel", { id: parent.hotel_id }); }
      catch { return null; }
    },
    room: async (parent) => {
      try { return await call(hotelClient, "GetRoom", { id: parent.room_id }); }
      catch { return null; }
    }
  }
};

module.exports = { resolvers };
