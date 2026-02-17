import type { Facts } from "@/lib/schemas/facts";
import type { Node } from "./nodes";
import { NODES } from "./nodes";

export const nodesById = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function applyAnswer(facts: Facts, node: Node, value: string): Facts {
  // Simple mapping: node.id matches fact key.
  // Keep it boring and explicit.
  if (node.id === "supplyType") return { ...facts, supplyType: value as any };
  if (node.id === "movement") return { ...facts, movement: value as any };
  if (node.id === "customerType")
    return { ...facts, customerType: value as any };
  return facts;
}

export function getNextNodeId(facts: Facts): string | null {
  // Deterministic flow: ask whatever’s missing.
  if (!facts.supplyType) return "supplyType";
  if (!facts.movement) return "movement";
  if (!facts.customerType) return "customerType";
  return null;
}
