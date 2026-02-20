import { z } from "zod";
import { CitationSchema } from "./evidence";

export const QuestionSchema = z.object({
  //define what the server sends for each Q.
  id: z.string().min(1), //must be non-empty
  questionText: z.string().min(1), //non-empty Q text
  options: z
    .array(
      z.object({
        //at least two options per Q
        label: z.string().min(1),
        value: z.string().min(1),
        description: z.string().nullable(),
        citeParagraph: z.number().int().nonnegative(),
      }),
    )
    .min(2),
  reasoning: z.string().min(1), //the relevance of the Q
  citeParagraphs: z.array(z.number().int().nonnegative()).min(1), //at least one citation.
});

export const FlowRequestSchema = z.object({
  //what the client POSTS
  userText: z.string().optional(), //allow empty userText for follow-up rounds where the user doesn't need to input anything.
  answered: z //matches what submitclarifiers constructs - array of {id, value} pairs for answered clarifiers. optional because it's only sent in follow-up rounds, not the initial one.
    .array(
      z.object({
        id: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  state: z
    .object({
      answers: z.record(z.string(), z.string()),
      asked: z.array(z.string()),
      basePaths: z.array(z.string()).optional(),
    })
    .optional(),
});

export const FlowResponseSchema = z.object({
  state: z.object({
    answers: z.record(z.string(), z.string()),
    asked: z.array(z.string()),
    basePaths: z.array(z.string()).optional(),
  }),
  questions: z.array(QuestionSchema), //clarifier Q's. can be empty
  answer: z //answer would be null if it has questions. or provide an answer with no questions
    .object({
      conclusion: z.string(),
      reasoning: z.array(z.string()),
    })
    .nullable(),
  evidencePool: z.array(CitationSchema),
  citations: z.array(CitationSchema),
  // computed deterministically in the route — true when retrieval may be incomplete
  // (only notice 700 selected, or cited paragraphs contain no explicit VAT treatment language).
  // the client should use this to show a disclaimer rather than a confident answer.
  needsReview: z.boolean(),
});

export type FlowResponse = z.infer<typeof FlowResponseSchema>;
