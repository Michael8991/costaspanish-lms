import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import { buildInitialStudentPlan } from "../../lib/utils/student-initial-plan";
import { createStudentProfileSchema } from "../../lib/validators/student";
import { StudentProfile } from "../../models/StudentProfile";

const input = {
  fullName: "Initial Plan Test",
  contactEmail: "initial-plan@example.test",
  name: "Plan inicial",
  billingType: "single" as const,
  classType: "private" as const,
  validUntil: "2027-12-31",
  price: 80,
};

function parse(overrides: Record<string, unknown> = {}) {
  return createStudentProfileSchema.parse({ ...input, ...overrides });
}

test("POST /api/students initial plan persists canonical positive price and unpaid state", async () => {
  const plan = buildInitialStudentPlan(parse());
  const student = new StudentProfile({
    teacherId: new Types.ObjectId(),
    contactEmail: input.contactEmail,
    contactEmailLower: input.contactEmail,
    fullName: input.fullName,
    activePlans: [plan],
  });
  await student.validate();
  const stored = student.toObject().activePlans[0];
  assert.equal(stored.price, 80);
  assert.equal(stored.priceTotal, 80);
  assert.equal(stored.priceTotalCents, 8000);
  assert.equal(stored.amountPaid, 0);
  assert.equal(stored.amountPaidCents, 0);
  assert.equal(stored.paymentStatus, "pending");
  assert.equal(stored.paidAt, null);
  assert.equal(stored.paymentMethod, "");
  assert.equal(stored.paymentNotes, "");
});

test("POST /api/students preserves an explicitly free initial plan as canonical zero", () => {
  const plan = buildInitialStudentPlan(parse({ price: 0 }));
  assert.equal(plan.price, 0);
  assert.equal(plan.priceTotal, 0);
  assert.equal(plan.priceTotalCents, 0);
  assert.equal(plan.amountPaidCents, 0);
});

test("POST /api/students rejects missing, null or blank price and missing initial plan", () => {
  for (const price of [undefined, null, "", " ", false, []]) {
    assert.equal(createStudentProfileSchema.safeParse({ ...input, price }).success, false);
  }
  assert.equal(createStudentProfileSchema.safeParse({ ...input, price: 80.001 }).success, false);
  assert.equal(createStudentProfileSchema.safeParse({
    fullName: input.fullName,
    contactEmail: input.contactEmail,
    billingType: input.billingType,
    classType: input.classType,
    validUntil: input.validUntil,
    price: input.price,
  }).success, false);
});

test("POST /api/students rejects client-controlled payment fields", () => {
  for (const extra of [
    { paymentStatus: "paid" },
    { paymentStatus: "partial" },
    { amountPaid: 80 },
    { amountPaidCents: 8000 },
    { paidAt: "2026-09-19" },
    { paymentMethod: "cash" },
    { paymentNotes: "paid outside ledger" },
  ]) {
    assert.equal(createStudentProfileSchema.safeParse({ ...input, ...extra }).success, false);
  }
});
