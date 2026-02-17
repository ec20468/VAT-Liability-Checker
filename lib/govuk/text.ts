/**
 * Extremely basic HTML → paragraphs.
 * This is not “perfect parsing”. It’s good enough for v1.
 * We only need stable paragraph indices we can cite.
 */
export function htmlToParagraphs(html: string) {
  // Grab <p> blocks first (cheap win).
  const pMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map(
    (m) => m[1],
  );

  const raw = pMatches.length > 0 ? pMatches : [html];

  const cleaned = raw
    .map((s) =>
      s
        .replace(/<[^>]+>/g, " ") // strip tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((t) => t.length > 40);

  return cleaned.map((text, i) => ({ index: i, text }));
}
