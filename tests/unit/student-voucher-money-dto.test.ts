import assert from "node:assert/strict";
import test from "node:test";

import { toStudentPlanListDTO } from "../../lib/dto/student.dto";

const voucher = {
  name: "Bono",
  billingType: "package" as const,
  classType: "private" as const,
  validFrom: new Date("2026-01-01T00:00:00Z"),
  validUntil: new Date("2026-12-31T00:00:00Z"),
  creditsTotal: 10,
  creditsRemaining: 10,
};

test("voucher DTO exposes canonical cents as euros ahead of stale legacy values", () => {
  const dto = toStudentPlanListDTO({
    ...voucher,
    price: 80,
    priceTotal: 80,
    priceTotalCents: 12000,
    amountPaid: 30,
    amountPaidCents: 4000,
  });
  assert.equal(dto.priceTotal, 120);
  assert.equal(dto.amountPaid, 40);
});

test("voucher DTO retains euro fallback for unmigrated production documents", () => {
  const dto = toStudentPlanListDTO({
    ...voucher,
    price: 80,
    amountPaid: 30,
  });
  assert.equal(dto.priceTotal, 80);
  assert.equal(dto.amountPaid, 30);
});
