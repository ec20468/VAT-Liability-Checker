import { getContentItem } from "./contentApi";

export type VatNoticeIndexItem = {
  title: string;
  basePath: string;
  apiUrl?: string;
  webUrl?: string;
};

const COLLECTION_BASE_PATH =
  "/government/collections/vat-notices-numerical-order";

// Simple in-memory cache (fine for dev; Vercel will re-init per runtime)
let cached: { at: number; items: VatNoticeIndexItem[] } | null = null;

// 6 hours
const CACHE_MS = 6 * 60 * 60 * 1000;

export async function getVatNoticesIndex(): Promise<VatNoticeIndexItem[]> {
  //if cache is fresh, return cached list. otherwise fetch from GOV.UK, transform into the above shape, cache, and return.
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.items;

  const collection = await getContentItem(COLLECTION_BASE_PATH);

  const docs: any[] = collection?.links?.documents ?? [];

  const items: VatNoticeIndexItem[] = docs
    .map((d: any) => {
      const basePath: string | undefined = d?.base_path;
      const title: string | undefined = d?.title;
      if (!basePath || !title) return null;

      return {
        title,
        basePath,
        apiUrl: d?.api_url,
        webUrl: d?.web_url,
      } as VatNoticeIndexItem;
    })
    .filter((item): item is VatNoticeIndexItem => item !== null);

  if (items.length === 0) {
    throw new Error(
      "VAT notices index returned 0 documents. Check the collection basePath or GOV.UK response shape.",
    );
  }

  cached = { at: now, items };
  return items;
}
