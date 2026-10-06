export async function findByUserId(db, userId) {
  return db.BuilderProfile.findOne({ userId }).lean();
}

export async function findPublicByUsername(db, username) {
  return db.BuilderProfile.findOne({ username, visibility: 'PUBLIC' }).lean();
}

/** True when `username` is already taken by another user's profile. */
export async function usernameTaken(db, username, excludeUserId) {
  const q = { username };
  if (excludeUserId) q.userId = { $ne: excludeUserId };
  return !!(await db.BuilderProfile.exists(q));
}
