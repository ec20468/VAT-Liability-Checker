// scripts/inspect-vat.ts
const GOV = "https://www.gov.uk/api/content";
const COLLECTION = "government/collections/vat-notices-numerical-order";

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

type CollectionDoc = {
  title: string;
  base_path: string;
  api_url: string;
  web_url: string;
  content_id: string;
  public_updated_at?: string;
};

function bodyLength(item: any) {
  const html = item?.details?.body;
  return typeof html === "string" ? html.length : 0;
}

async function main() {
  const collection = await getJson(`${GOV}/${COLLECTION}`);
  const docs: CollectionDoc[] = collection?.links?.documents ?? [];
  console.log("docs:", docs.length);

  const schemaSet = new Set<string>();
  const typeSet = new Set<string>();

  let parentCount = 0;
  let childCount = 0;
  let noneCount = 0;

  for (const d of docs) {
    const item = await getJson(d.api_url);

    const parentBodyLen =
      typeof item?.details?.body === "string" ? item.details.body.length : 0;

    const children = Array.isArray(item?.links?.children)
      ? item.links.children
      : [];

    let maxChildLen = 0;

    for (const c of children) {
      if (typeof c?.base_path !== "string") continue;
      const childItem = await getJson(
        `${GOV}/${c.base_path.replace(/^\//, "")}`,
      );
      const len =
        typeof childItem?.details?.body === "string"
          ? childItem.details.body.length
          : 0;
      if (len > maxChildLen) maxChildLen = len;
    }

    const ingestCandidate =
      parentBodyLen >= maxChildLen
        ? parentBodyLen > 0
          ? "parent"
          : "none"
        : "child";

    if (ingestCandidate === "parent") parentCount++;
    else if (ingestCandidate === "child") childCount++;
    else noneCount++;

    if (item?.schema_name) schemaSet.add(item.schema_name);
    if (item?.document_type) typeSet.add(item.document_type);
  }

  console.log("\n=== AGGREGATES ===\n");
  console.log("Unique schema_name count:", schemaSet.size);
  console.log("schema_name values:", [...schemaSet]);

  console.log("\nUnique document_type count:", typeSet.size);
  console.log("document_type values:", [...typeSet]);

  console.log("\nIngest candidates:");
  console.log("parent:", parentCount);
  console.log("child:", childCount);
  console.log("none:", noneCount);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
