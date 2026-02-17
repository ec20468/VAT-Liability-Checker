export type Node = {
  id: string;
  question: string;
  kind: "single";
  options: { value: string; label: string }[];
};

export const NODES: Node[] = [
  {
    id: "supplyType",
    question: "What are we talking about here?",
    kind: "single",
    options: [
      { value: "goods", label: "Goods (a physical item)" },
      { value: "services", label: "Services (work / digital / labour)" },
    ],
  },
  {
    id: "movement",
    question: "Is this an import/export situation or just domestic?",
    kind: "single",
    options: [
      { value: "import", label: "Import (coming into the UK)" },
      { value: "export", label: "Export (leaving the UK)" },
      { value: "domestic", label: "Domestic (UK only)" },
    ],
  },
  {
    id: "customerType",
    question: "Who is the customer?",
    kind: "single",
    options: [
      { value: "business", label: "A business" },
      { value: "consumer", label: "A consumer" },
    ],
  },
];
