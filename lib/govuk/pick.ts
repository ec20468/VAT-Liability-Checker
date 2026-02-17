import type { ResolvedDoc } from "./resolve";

export const KEYWORDS_BY_NODE: Record<string, string[]> = {
  supplyType: ["goods", "services", "supply", "liability"],
  movement: ["import", "export", "outside", "UK", "acquisition"],
  customerType: ["business", "customer", "consumer", "taxable person"],
  final: ["liability", "rate", "zero", "exempt", "standard", "VAT"],
};

/**
 * Return a small list of paragraphs likely relevant for the node.
 * This is the main token-saver.
 */
export function pickCandidateParagraphs(
  doc: ResolvedDoc,
  nodeId: string,
  max = 20,
) {
  const keywords = KEYWORDS_BY_NODE[nodeId] ?? [];

  // If no keywords, just take the start.
  if (keywords.length === 0) return doc.paragraphs.slice(0, max);

  const scored = doc.paragraphs
    .map((p) => {
      const text = p.text.toLowerCase();
      let score = 0;
      for (const k of keywords) {
        if (text.includes(k.toLowerCase())) score += 1;
      }
      return { ...p, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ score, ...rest }) => rest);

  // Fallback if nothing matched.
  return scored.length > 0 ? scored : doc.paragraphs.slice(0, max);
}
