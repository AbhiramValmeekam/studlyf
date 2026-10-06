/** Publicly visible = PUBLISHED and its publish time has arrived (supports scheduling). */
export function isPublished(now = new Date()) {
  return { status: 'PUBLISHED', publishedAt: { $ne: null, $lte: now } };
}

/**
 * Normalises status/publishedAt on create/update: publishing without a date stamps
 * "now"; an explicit future date schedules the item.
 */
export function resolvePublishFields(
  input,
  existing,
) {
  const status = input.status ?? existing?.status;
  const out = {};
  if (input.status !== undefined) out.status = input.status;
  if (input.publishedAt !== undefined) out.publishedAt = input.publishedAt;
  if (status === 'PUBLISHED' && !(input.publishedAt ?? existing?.publishedAt)) out.publishedAt = new Date();
  return out;
}
