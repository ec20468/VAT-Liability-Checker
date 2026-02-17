import { z } from "zod";

/**
 * IMPORTANT:
 * The AI gateway structured output is strict about JSON schema:
 * every key must be in `required`.
 *
 * So we make every key required, but allow null to mean “unknown”.
 */
export const FactsSchema = z.object({
  supplyType: z.enum(["goods", "services"]).nullable(),
  movement: z.enum(["import", "export", "domestic"]).nullable(),
  customerType: z.enum(["business", "consumer"]).nullable(),

  item: z.string().min(1).nullable(),

  fromCountry: z.string().min(2).nullable(),
  toCountry: z.string().min(2).nullable(),
});

export type Facts = z.infer<typeof FactsSchema>;

/**
 * Helper: treat null like “not set” in our own logic if you want.
 * I’m keeping it explicit so you see what’s missing.
 */
export function mergeFacts(current: Facts, incoming: Facts): Facts {
  return {
    supplyType:
      incoming.supplyType !== null ? incoming.supplyType : current.supplyType,
    movement: incoming.movement !== null ? incoming.movement : current.movement,
    customerType:
      incoming.customerType !== null
        ? incoming.customerType
        : current.customerType,
    item: incoming.item !== null ? incoming.item : current.item,
    fromCountry:
      incoming.fromCountry !== null
        ? incoming.fromCountry
        : current.fromCountry,
    toCountry:
      incoming.toCountry !== null ? incoming.toCountry : current.toCountry,
  };
}
