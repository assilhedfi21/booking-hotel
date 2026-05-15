const API = "/api";
const GRAPHQL = "/graphql";

// --- helpers ---------------------------------------------------------------
async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

async function gql(query, variables = {}) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

function toast(message, danger = false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.style.background = danger ? "#dc2626" : "#1f2937";
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

// --- tabs ------------------------------------------------------------------
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// --- hotels ----------------------------------------------------------------
async function loadHotels(filters = {}) {
  const qs = new URLSearchParams();
  if (filters.city) qs.set("city", filters.city);
  if (filters.min_stars) qs.set("min_stars", filters.min_stars);

  const data = await api("/hotels?" + qs.toString());
  renderHotels(data.hotels || []);
}

function renderHotels(hotels) {
  const grid = document.getElementById("hotels-grid");
  grid.innerHTML = "";

  if (hotels.length === 0) {
    grid.innerHTML = '<p class="hint">No hotels found.</p>';
    return;
  }

  hotels.forEach(async (hotel) => {
    const card = document.createElement("div");
    card.className = "hotel-card";
    const stars = "★".repeat(hotel.stars) + "☆".repeat(5 - hotel.stars);

    card.innerHTML = `
      <h3>${hotel.name}</h3>
      <div class="city">${hotel.city}, ${hotel.country}</div>
      <div class="stars">${stars}</div>
      <p>${hotel.description || ""}</p>
      <div class="rooms-list"><em>Loading rooms…</em></div>
    `;
    grid.appendChild(card);

    try {
      const rooms = await api(`/hotels/${hotel.id}/rooms`);
      const list = card.querySelector(".rooms-list");
      list.innerHTML = "<h4>Rooms</h4>";
      (rooms.rooms || []).forEach((room) => {
        const r = document.createElement("div");
        r.className = "room";
        r.innerHTML = `
          <div>
            <strong>#${room.number}</strong> · ${room.type}<br />
            <small>${room.capacity} pers · $${room.price_per_night}/night</small>
          </div>
          <div>
            <span class="tag ${room.available ? "available" : "unavailable"}">
              ${room.available ? "Available" : "Booked"}
            </span>
          </div>
        `;
        if (room.available) {
          const btn = document.createElement("button");
          btn.textContent = "Book";
          btn.style.marginLeft = "8px";
          btn.onclick = () => openBookingModal(hotel, room);
          r.querySelector("div:last-child").appendChild(btn);
        }
        list.appendChild(r);
      });
    } catch (err) {
      card.querySelector(".rooms-list").textContent = "Failed to load rooms.";
    }
  });
}

document.getElementById("btn-search").addEventListener("click", () => {
  loadHotels({
    city: document.getElementById("filter-city").value.trim(),
    min_stars: document.getElementById("filter-stars").value
  });
});

document.getElementById("btn-reset").addEventListener("click", () => {
  document.getElementById("filter-city").value = "";
  document.getElementById("filter-stars").value = "";
  loadHotels();
});

// --- booking modal ---------------------------------------------------------
let currentHotel = null;
let currentRoom = null;

function openBookingModal(hotel, room) {
  currentHotel = hotel;
  currentRoom = room;
  document.getElementById("modal-room-info").innerHTML =
    `<strong>${hotel.name}</strong> · Room #${room.number} · $${room.price_per_night}/night`;
  document.getElementById("modal").classList.remove("hidden");
}

document.getElementById("m-cancel").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("m-confirm").addEventListener("click", async () => {
  const payload = {
    user_email: document.getElementById("m-email").value.trim(),
    user_name: document.getElementById("m-name").value.trim(),
    hotel_id: currentHotel.id,
    room_id: currentRoom.id,
    check_in: document.getElementById("m-checkin").value,
    check_out: document.getElementById("m-checkout").value
  };

  if (!payload.user_email || !payload.user_name || !payload.check_in || !payload.check_out) {
    return toast("Please fill in all fields", true);
  }

  try {
    const booking = await api("/bookings", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    toast(`Booking confirmed: ${booking.id} · $${booking.total_price}`);
    document.getElementById("modal").classList.add("hidden");
    loadHotels();
  } catch (err) {
    toast(err.message, true);
  }
});

// --- bookings tab ----------------------------------------------------------
document.getElementById("btn-load-bookings").addEventListener("click", async () => {
  const email = document.getElementById("user-email").value.trim();
  if (!email) return toast("Email required", true);

  try {
    const data = await api("/bookings?user_email=" + encodeURIComponent(email));
    const list = document.getElementById("bookings-list");
    list.innerHTML = "";
    if (!data.bookings || data.bookings.length === 0) {
      list.innerHTML = '<p class="hint">No bookings.</p>';
      return;
    }
    data.bookings.forEach((b) => {
      const card = document.createElement("div");
      card.className = "booking-card";
      card.innerHTML = `
        <div>
          <strong>#${b.id}</strong> · ${b.check_in} → ${b.check_out} (${b.nights} night${b.nights > 1 ? "s" : ""})<br />
          <small>Hotel ${b.hotel_id} · Room ${b.room_id} · Total $${b.total_price}</small>
        </div>
        <div>
          <span class="tag ${b.status === "CONFIRMED" ? "confirmed" : "cancelled"}">${b.status}</span>
          ${b.status === "CONFIRMED"
            ? `<button class="danger" data-cancel="${b.id}" style="margin-left:8px">Cancel</button>`
            : ""}
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll("button[data-cancel]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api("/bookings/" + btn.dataset.cancel + "/cancel", { method: "POST" });
          toast("Booking cancelled");
          document.getElementById("btn-load-bookings").click();
        } catch (err) {
          toast(err.message, true);
        }
      });
    });
  } catch (err) {
    toast(err.message, true);
  }
});

// --- notifications tab -----------------------------------------------------
async function renderNotifications(notifs) {
  const list = document.getElementById("notifications-list");
  list.innerHTML = "";
  if (!notifs || notifs.length === 0) {
    list.innerHTML = '<p class="hint">No notifications yet.</p>';
    return;
  }
  notifs.forEach((n) => {
    const card = document.createElement("div");
    card.className = "notification-card" + (n.read ? "" : " unread");
    card.innerHTML = `
      <div>
        <strong>${n.title}</strong> · <small>${n.type}</small><br />
        ${n.message}<br />
        <small>${n.user_email} · ${new Date(n.created_at).toLocaleString()}</small>
      </div>
      <div>
        ${!n.read ? `<button data-read="${n.id}">Mark read</button>` : ""}
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("button[data-read]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api("/notifications/" + btn.dataset.read + "/read", { method: "POST" });
        document.getElementById("btn-load-notifications").click();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

document.getElementById("btn-load-notifications").addEventListener("click", async () => {
  const email = document.getElementById("notif-email").value.trim();
  if (!email) return toast("Email required", true);
  try {
    const data = await api("/notifications?user_email=" + encodeURIComponent(email));
    renderNotifications(data.notifications || []);
  } catch (err) {
    toast(err.message, true);
  }
});

document.getElementById("btn-load-all-notifications").addEventListener("click", async () => {
  try {
    const data = await api("/notifications");
    renderNotifications(data.notifications || []);
  } catch (err) {
    toast(err.message, true);
  }
});

// --- graphql tab -----------------------------------------------------------
document.getElementById("btn-run-gql").addEventListener("click", async () => {
  const query = document.getElementById("gql-query").value;
  const result = await gql(query);
  document.getElementById("gql-result").textContent = JSON.stringify(result, null, 2);
});

// --- boot ------------------------------------------------------------------
loadHotels().catch((err) => toast(err.message, true));
