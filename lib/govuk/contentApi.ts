const GOVUK_API = "https://www.gov.uk/api/content";

/**
 * Fetch one GOV.UK content item JSON from the Content API.
 * basePath must look like "/guidance/vat-guide-notice-700"
 */
export async function getContentItem(basePath: string) {
  const url = `${GOVUK_API}${basePath}`;
  const res = await fetch(url, {
    // GOV.UK is fine with this; also helps caching on Vercel
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    throw new Error(`GOV.UK API failed ${res.status} for ${basePath}`);
  }

  return res.json() as Promise<any>;
}
