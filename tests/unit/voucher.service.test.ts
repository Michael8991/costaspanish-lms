import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import { resolveVoucherForLesson, VoucherDomainError } from "../../lib/services/voucher.service";

const studentEnrollment = new Types.ObjectId();
const courseId = new Types.ObjectId();
const voucher = (month: number, credits = 8, enrollmentId = studentEnrollment) => ({
  _id: new Types.ObjectId(),
  enrollmentId,
  courseId,
  classType: "group_regular" as const,
  status: "active" as const,
  creditsRemaining: credits,
  validFrom: new Date(Date.UTC(2026, month - 1, 1)),
  validUntil: new Date(Date.UTC(2026, month, 0, 23, 59, 59, 999)),
});

function resolve(vouchers: ReturnType<typeof voucher>[], lessonDate: Date) {
  return resolveVoucherForLesson({
    vouchers,
    enrollmentId: studentEnrollment.toString(),
    courseId: courseId.toString(),
    classType: "group_regular",
    lessonDate,
    requiredCredits: 1,
  });
}

test("same voucher type can coexist and lesson date selects its period", () => {
  const september = voucher(9, 2);
  const october = voucher(10, 8);
  assert.equal(resolve([september, october], new Date("2026-09-29T10:00:00Z"))?._id, september._id);
  assert.equal(resolve([september, october], new Date("2026-10-03T10:00:00Z"))?._id, october._id);
});

test("future, expired, other course enrollment and exhausted vouchers are rejected", () => {
  const september = voucher(9, 2);
  assert.equal(resolve([september], new Date("2026-10-03T10:00:00Z")), undefined);
  assert.equal(resolve([voucher(10)], new Date("2026-09-29T10:00:00Z")), undefined);
  assert.equal(resolve([voucher(9, 8, new Types.ObjectId())], new Date("2026-09-29T10:00:00Z")), undefined);
  assert.equal(resolve([voucher(9, 0)], new Date("2026-09-29T10:00:00Z")), undefined);
});

test("overlapping usable vouchers fail instead of selecting arbitrarily", () => {
  assert.throws(
    () => resolve([voucher(10), voucher(10)], new Date("2026-10-03T10:00:00Z")),
    VoucherDomainError,
  );
});

test("reserved credits prevent two consumers from spending the last credit", () => {
  const only = voucher(9, 1);
  const result = resolveVoucherForLesson({
    vouchers: [only],
    enrollmentId: studentEnrollment.toString(),
    courseId: courseId.toString(),
    classType: "group_regular",
    lessonDate: new Date("2026-09-10T10:00:00Z"),
    requiredCredits: 1,
    reservedCredits: () => 1,
  });
  assert.equal(result, undefined);
});
