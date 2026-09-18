import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import { createStudentVoucherSchema, updateStudentVoucherSchema } from "../../lib/validators/voucher";
import { resolveVoucherForLesson } from "../../lib/services/voucher.service";

const baseCreatePayload = {
  name: "Bono septiembre",
  billingType: "package" as const,
  classType: "private" as const,
  creditsTotal: 10,
  creditsRemaining: 8,
  validFrom: "2026-09-01",
  validUntil: "2026-09-30",
  price: 160,
};

function apiDateOnly(value: Date) {
  return JSON.parse(JSON.stringify({ value })).value.slice(0, 10);
}

test("voucher creation preserves calendar dates through Zod and JSON round trip", () => {
  const parsed = createStudentVoucherSchema.parse(baseCreatePayload);
  assert.equal(parsed.validFrom?.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(parsed.validUntil.toISOString(), "2026-09-30T00:00:00.000Z");
  assert.equal(apiDateOnly(parsed.validFrom!), "2026-09-01");
  assert.equal(apiDateOnly(parsed.validUntil), "2026-09-30");
});

test("editing validUntil preserves validFrom by keeping absent fields absent", () => {
  const patch = updateStudentVoucherSchema.parse({ validUntil: "2026-10-15" });
  assert.deepEqual(Object.keys(patch), ["validUntil"]);
  assert.equal(patch.validUntil?.toISOString(), "2026-10-15T00:00:00.000Z");
});

test("editing credits does not materialize either voucher date", () => {
  assert.deepEqual(updateStudentVoucherSchema.parse({ creditsRemaining: 7 }), {
    creditsRemaining: 7,
  });
});

test("validUntil is inclusive for its complete UTC calendar day", () => {
  const voucher = {
    _id: new Types.ObjectId(),
    enrollmentId: new Types.ObjectId(),
    courseId: new Types.ObjectId(),
    classType: "private" as const,
    status: "active" as const,
    creditsRemaining: 1,
    validFrom: new Date("2026-09-01T00:00:00.000Z"),
    validUntil: new Date("2026-09-30T00:00:00.000Z"),
  };
  const resolve = (lessonDate: string) => resolveVoucherForLesson({
    vouchers: [voucher],
    enrollmentId: voucher.enrollmentId.toString(),
    courseId: voucher.courseId.toString(),
    classType: "private",
    lessonDate: new Date(lessonDate),
    requiredCredits: 1,
  });
  assert.equal(resolve("2026-09-30T23:59:59.999Z")?._id, voucher._id);
  assert.equal(resolve("2026-10-01T00:00:00.000Z"), undefined);
});

test("documents the PATCH status boundary mismatch on the validUntil day", () => {
  const storedValidUntil = new Date("2026-09-30T00:00:00.000Z");
  const middayOnSameCalendarDate = new Date("2026-09-30T12:00:00.000Z");
  const routeCurrentlyMarksExpired = storedValidUntil < middayOnSameCalendarDate;
  assert.equal(routeCurrentlyMarksExpired, true);
});

test("month and year boundaries preserve their exact date-only values", () => {
  for (const value of ["2026-09-30", "2026-10-01", "2026-12-31", "2027-01-01"]) {
    const parsed = updateStudentVoucherSchema.parse({ validUntil: value });
    assert.equal(apiDateOnly(parsed.validUntil!), value);
  }
});

test("Europe/Madrid DST boundary dates remain UTC date-only values", () => {
  for (const value of ["2026-03-29", "2026-10-25"]) {
    const parsed = updateStudentVoucherSchema.parse({ validUntil: value });
    assert.equal(parsed.validUntil?.toISOString(), `${value}T00:00:00.000Z`);
    assert.equal(apiDateOnly(parsed.validUntil!), value);
  }
});

test("create-read-unrelated edit-read round trip preserves both dates", () => {
  const created = createStudentVoucherSchema.parse(baseCreatePayload);
  const stored = {
    validFrom: new Date(JSON.parse(JSON.stringify(created.validFrom))),
    validUntil: new Date(JSON.parse(JSON.stringify(created.validUntil))),
  };
  const patch = updateStudentVoucherSchema.parse({ creditsRemaining: 7 });
  const afterPatch = { ...stored, ...patch };
  assert.equal(apiDateOnly(afterPatch.validFrom), "2026-09-01");
  assert.equal(apiDateOnly(afterPatch.validUntil), "2026-09-30");
});
