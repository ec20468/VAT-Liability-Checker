import { z } from "zod";
import { CitationSchema } from "./evidence";

export const QuestionSchema = z.object({
  //define what the server sends for each Q.
  id: z.string().min(1), //must be non-empty
  questionText: z.string().min(1), //on-empty Q text
  options: z
    .array(
      z.object({
        //at least two options per Q
        label: z.string().min(1),
        value: z.string().min(1),
        description: z.string().nullable(),
      }),
    )
    .min(2),
  reasoning: z.string().min(1), //the relevance of the Q
  citeParagraphs: z.array(z.number().int().nonnegative()).min(1), //atleast one citation.
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
  state: z //server tracks which question IDs it has asked already. avoid repeated Q's
    .object({
      answers: z.record(z.string(), z.string()),
      asked: z.array(z.string()),
    })
    .optional(),
});

export const FlowResponseSchema = z.object({
  state: z.object({
    //every response includes the updated state. avoid repeated Q's and track answers.
    answers: z.record(z.string(), z.string()),
    asked: z.array(z.string()),
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
});

export type FlowResponse = z.infer<typeof FlowResponseSchema>;
