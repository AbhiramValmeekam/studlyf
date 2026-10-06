export async function insert(db, doc) {
  return db.Notification.create(doc);
}

export async function list(db, filter, { page, pageSize }) {
  return db.Notification.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();
}

export async function count(db, filter) {
  return db.Notification.countDocuments(filter);
}

export async function findOwned(db, userId, id) {
  return db.Notification.findOne({ _id: id, userId }).lean();
}

export async function markRead(db, id) {
  return db.Notification.updateOne({ _id: id }, { $set: { readAt: new Date() } });
}

export async function markAllRead(db, userId) {
  return db.Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
}
