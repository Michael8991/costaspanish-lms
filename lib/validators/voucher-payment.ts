import { z } from "zod";

export const registerVoucherPaymentSchema = z
  .object({
    amountCents: z.coerce.number().int().positive(),
    paymentMethod: z.enum([
      "cash",
      "bank_transfer",
      "bizum",
      "card",
      "other",
      "",
    ]),
    paidAt: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).optional().default(""),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export type RegisterVoucherPaymentInput = z.infer<
  typeof registerVoucherPaymentSchema
>;
