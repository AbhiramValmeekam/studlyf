import sanitizeHtml from 'sanitize-html';

export function slugify(input) {
  return (
    input
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 140) || 'item'
  );
}

/**
 * Rich-text (admin-authored) HTML is sanitised on write with a strict allow-list:
 * no scripts, no event handlers, no inline styles, links limited to http(s)/mailto.
 */
export function sanitizeRichText(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'code', 'pre',
      'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
    },
  });
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD = /[\p{L}\p{N}]+/gu;
const MAX_TERMS = 1000;

/** Search tokens from user input: letters/digits only (max 8), so input can never become a query operator. */
export function searchTokens(q) {
  return q?.toLowerCase().match(WORD)?.slice(0, 8) ?? [];
}

/** Indexable word list for a document: lower-cased, de-duplicated, HTML stripped. */
export function termsOf(...parts) {
  const words = new Set();
  for (const part of parts) {
    if (!part) continue;
    for (const w of part.replace(/<[^>]+>/g, ' ').toLowerCase().match(WORD) ?? []) {
      words.add(w);
      if (words.size >= MAX_TERMS) return [...words];
    }
  }
  return [...words];
}

/**
 * "react dev" → every word must match the start of some indexed term.
 * Anchored regexes on a multikey-indexed array use index bounds, not a collection scan.
 */
export function prefixSearchFilter(q) {
  const tokens = searchTokens(q);
  if (!tokens.length) return null;
  return { searchTerms: { $all: tokens.map((t) => new RegExp(`^${escapeRegex(t)}`)) } };
}

/** Aggregation expression: how many search tokens prefix-match a title word (for relevance sort). */
export function titleRankExpression(q) {
  const tokens = searchTokens(q);
  return {
    $size: {
      $filter: {
        input: '$titleTerms',
        cond: { $or: tokens.map((t) => ({ $regexMatch: { input: '$$this', regex: `^${escapeRegex(t)}` } })) },
      },
    },
  };
}
