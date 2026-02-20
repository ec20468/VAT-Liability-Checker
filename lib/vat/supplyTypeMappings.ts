// lib/vat/supplyTypeMappings.ts

import { questionTemplates } from "./questionTemplates";

export interface DecisionNode {
  questionId: string;
  branchMap: Record<string, DecisionNode | "ANSWER">;
  evidenceParagraphs: number[]; // These are paragraph indices in the original document, not pool indices
}

export const supplyTypeDecisionTrees: Record<string, DecisionNode> = {
  "takeaway food": {
    questionId: "food-temperature",
    branchMap: {
      hot: {
        questionId: "catering-type",
        branchMap: {
          catering: "ANSWER",
          retail: "ANSWER",
        },
        evidenceParagraphs: [48, 49],
      },
      cold: {
        questionId: "confectionery-type",
        branchMap: {
          "chocolate-confectionery": "ANSWER",
          "non-confectionery": "ANSWER",
        },
        evidenceParagraphs: [15],
      },
    },
    evidenceParagraphs: [47, 48],
  },
  catering: {
    questionId: "food-temperature",
    branchMap: {
      hot: "ANSWER",
      cold: {
        questionId: "confectionery-type",
        branchMap: {
          "chocolate-confectionery": "ANSWER",
          "non-confectionery": "ANSWER",
        },
        evidenceParagraphs: [15],
      },
    },
    evidenceParagraphs: [19, 47],
  },
  confectionery: {
    questionId: "confectionery-type",
    branchMap: {
      "chocolate-confectionery": "ANSWER",
      "non-confectionery": "ANSWER",
    },
    evidenceParagraphs: [15],
  },
  restaurant: {
    questionId: "food-temperature",
    branchMap: {
      hot: "ANSWER",
      cold: {
        questionId: "confectionery-type",
        branchMap: {
          "chocolate-confectionery": "ANSWER",
          "non-confectionery": "ANSWER",
        },
        evidenceParagraphs: [15],
      },
    },
    evidenceParagraphs: [19, 47],
  },
};
