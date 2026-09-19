import type { z } from "zod";

import type { createStudentProfileSchema } from "@/lib/validators/student";
import { isDateOnlyExpired } from "@/lib/utils/date-only";
import { toCents } from "@/lib/utils/money";

type StudentCreation = z.infer<typeof createStudentProfileSchema>;

export function buildInitialStudentPlan(payload: StudentCreation) {
  const creditsTotal = payload.creditsTotal ?? 0;
  const creditsRemaining = payload.creditsRemaining ?? creditsTotal;
  const priceTotalCents = toCents(payload.price);
  if (!Number.isSafeInteger(priceTotalCents)) {
    throw new Error("Initial plan price exceeds safe integer cents");
  }

  return {
    name: payload.name,
    billingType: payload.billingType,
    classType: payload.classType,
    validUntil: payload.validUntil,
    creditsTotal,
    creditsRemaining,
    status: creditsRemaining <= 0
      ? "exhausted" as const
      : isDateOnlyExpired(payload.validUntil)
        ? "expired" as const
        : "active" as const,
    price: payload.price,
    priceTotal: payload.price,
    priceTotalCents,
    paymentStatus: "pending" as const,
    amountPaid: 0,
    amountPaidCents: 0,
    paidAt: null,
    paymentMethod: "" as const,
    paymentNotes: "",
  };
}
