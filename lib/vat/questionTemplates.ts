// lib/vat/questionTemplates.ts

export interface QuestionTemplate {
  id: string;
  questionText: string;
  options: Array<{
    value: string;
    label: string;
    description: string | null;
    resolvesBranch: string;
    citeParagraph: number; // This will be 0 initially, we'll map it later
  }>;
  appliesTo: string[];
  evidenceSource: {
    basePath: string;
    paragraphIndex: number;
  };
}

export const questionTemplates: QuestionTemplate[] = [
  {
    id: "food-temperature",
    questionText:
      "Is the food being supplied hot at the time it is provided to the customer?",
    options: [
      {
        value: "hot",
        label: "Hot food",
        description: "Food above ambient air temperature",
        resolvesBranch: "hot-food-precondition",
        citeParagraph: 0,
      },
      {
        value: "cold",
        label: "Cold food",
        description: "Food not hot at time of supply",
        resolvesBranch: "cold-food",
        citeParagraph: 0,
      },
    ],
    appliesTo: ["takeaway food", "catering", "restaurant", "delivery", "food"],
    evidenceSource: {
      basePath: "/guidance/catering-takeaway-food-and-vat-notice-7091",
      paragraphIndex: 48,
    },
  },
  {
    id: "catering-type",
    questionText:
      "Is this food supplied as part of a catering service (e.g., restaurant dining, event catering) or as a retail takeaway item?",
    options: [
      {
        value: "catering",
        label: "Catering service",
        description: "Supplied with additional services like seating, serving",
        resolvesBranch: "catering-supply",
        citeParagraph: 0,
      },
      {
        value: "retail",
        label: "Retail takeaway",
        description: "Food sold as goods, not part of a service",
        resolvesBranch: "retail-supply",
        citeParagraph: 0,
      },
    ],
    appliesTo: ["takeaway food", "catering", "restaurant", "food"],
    evidenceSource: {
      basePath: "/guidance/catering-takeaway-food-and-vat-notice-7091",
      paragraphIndex: 19,
    },
  },
  {
    id: "confectionery-type",
    questionText:
      "Does the product contain chocolate or is it classified as confectionery?",
    options: [
      {
        value: "chocolate-confectionery",
        label: "Chocolate confectionery",
        description:
          "Products containing chocolate, even if not the main ingredient",
        resolvesBranch: "confectionery-exception",
        citeParagraph: 0,
      },
      {
        value: "non-confectionery",
        label: "Not confectionery",
        description:
          "Biscuits, cakes, or other baked goods not classified as confectionery",
        resolvesBranch: "standard-food",
        citeParagraph: 0,
      },
    ],
    appliesTo: ["confectionery", "snacks", "chocolate", "sweets", "food"],
    evidenceSource: {
      basePath: "/guidance/food-products-notice-70114",
      paragraphIndex: 15,
    },
  },
];
