import { getContentItem } from "./contentApi";
import { htmlToParagraphs } from "./text";

export type ResolvedDoc = {
  basePath: string;
  webUrl: string;
  title: string;
  paragraphs: { index: number; text: string }[];
};

//Turn a GOV.UK page into “paragraphs we can cite by index”.
export async function resolveGovUkDoc(basePath: string): Promise<ResolvedDoc> {
  const parent = await getContentItem(basePath);

  const parentHtml: string | undefined = parent?.details?.body;
  const children: string[] =
    parent?.links?.children?.map((c: any) => c.base_path).filter(Boolean) ?? [];

  // If parent has a real body, use it. Otherwise fall back to children.
  const htmlParts: string[] = [];

  if (parentHtml && parentHtml.length > 800) {
    htmlParts.push(parentHtml);
  } else if (children.length > 0) {
    for (const childPath of children) {
      const child = await getContentItem(childPath);
      const childHtml: string | undefined = child?.details?.body;
      if (childHtml && childHtml.length > 200) htmlParts.push(childHtml);
    }
  } else if (parentHtml) {
    // even if it's short, keep it (better than nothing)
    htmlParts.push(parentHtml);
  }

  const paragraphs = htmlToParagraphs(htmlParts.join("\n\n"));

  return {
    basePath: parent.base_path ?? basePath,
    webUrl: parent.web_url ?? `https://www.gov.uk${basePath}`,
    title: parent.title ?? "GOV.UK document",
    paragraphs,
  };
}
