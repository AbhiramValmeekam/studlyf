export const idOf = (v) => (v ? String(v) : null);

/** One query for every image referenced by a page of documents (avoids N+1). */
export async function loadMedia(db, ids) {
  const unique = [...new Set(ids.map(idOf).filter((v) => !!v))];
  if (!unique.length) return new Map();
  const rows = await db.MediaAsset.find({ _id: { $in: unique } })
    .select({ url: 1, mimeType: 1, width: 1, height: 1, altText: 1 })
    .lean();
  return new Map(
    rows.map((r) => [
      String(r._id),
      { id: String(r._id), url: r.url, mimeType: r.mimeType, width: r.width, height: r.height, alt: r.altText },
    ]),
  );
}

export const pick = (map, id) => {
  const key = idOf(id);
  return key ? (map.get(key) ?? null) : null;
};
