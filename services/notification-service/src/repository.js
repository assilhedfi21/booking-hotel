const { v4: uuid } = require("uuid");
const { getDb } = require("./db");

const docToNotification = (doc) => {
  const d = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: d.id,
    user_email: d.user_email,
    type: d.type,
    title: d.title,
    message: d.message,
    related_id: d.related_id || "",
    read: !!d.read,
    created_at: d.created_at
  };
};

const NotificationRepo = {
  async create({ user_email, type, title, message, related_id }) {
    const db = getDb();
    const doc = await db.notifications.insert({
      id: `n-${uuid().slice(0, 8)}`,
      user_email,
      type,
      title,
      message,
      related_id: related_id || "",
      read: false,
      created_at: new Date().toISOString()
    });
    return docToNotification(doc);
  },

  async list({ limit = 50 } = {}) {
    const db = getDb();
    const docs = await db.notifications
      .find({ sort: [{ created_at: "desc" }], limit: limit || 50 })
      .exec();
    return {
      notifications: docs.map(docToNotification),
      total: docs.length
    };
  },

  async listByUser(user_email) {
    const db = getDb();
    const docs = await db.notifications
      .find({ selector: { user_email }, sort: [{ created_at: "desc" }] })
      .exec();
    return {
      notifications: docs.map(docToNotification),
      total: docs.length
    };
  },

  async markAsRead(id) {
    const db = getDb();
    const doc = await db.notifications.findOne(id).exec();
    if (!doc) return null;
    await doc.patch({ read: true });
    return docToNotification(doc);
  }
};

module.exports = { NotificationRepo };
