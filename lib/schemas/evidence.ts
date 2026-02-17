import { z } from "zod";

export const EvidencePickSchema = z.object({
  picks: z.array(z.number()).max(3),
});

export const CitationSchema = z.object({
  url: z.string().url(),
  basePath: z.string(),

  // this is the pool index (the [n] I show the model)
  paragraphIndex: z.number(),

  docParagraphIndex: z.number().optional(), //distinguish the internal evidence pool index from the original doc's paragraph index, which is what we show the user.

  snippet: z.string(), //the text snippet shown to the user for this citation
});
