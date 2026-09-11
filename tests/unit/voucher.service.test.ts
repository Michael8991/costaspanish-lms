import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import {
  resolveVoucherForLesson,
  resolveVoucherForLessonResult,
  VoucherDomainError,
} from "../../lib/services/voucher.service";
import { calculateIndividualBillingPeriod } from "../../lib/utils/course-voucher-billing";

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

test("validUntil is inclusive for the complete final UTC calendar day", () => {
  const plan = {
    ...voucher(9),
    validFrom: new Date("2026-09-09T00:00:00.000Z"),
    validUntil: new Date("2026-10-08T00:00:00.000Z"),
  };

  assert.equal(resolve([plan], new Date("2026-09-09T00:00:00.000Z"))?._id, plan._id);
  assert.equal(resolve([plan], new Date("2026-10-08T10:00:00.000Z"))?._id, plan._id);
  assert.equal(resolve([plan], new Date("2026-10-08T20:00:00.000Z"))?._id, plan._id);
  assert.equal(resolve([plan], new Date("2026-10-08T23:59:59.999Z"))?._id, plan._id);
  assert.equal(resolve([plan], new Date("2026-09-08T23:59:59.999Z")), undefined);
  assert.equal(resolve([plan], new Date("2026-10-09T00:00:00.000Z")), undefined);
});

test("an existing lesson reservation selects that voucher without re-resolving another", () => {
  const reservedPlan = voucher(9, 2);
  const overlappingPlan = voucher(9, 2);
  const result = resolveVoucherForLessonResult({
    vouchers: [reservedPlan, overlappingPlan],
    reservedVoucherId: reservedPlan._id.toString(),
    enrollmentId: studentEnrollment.toString(),
    courseId: courseId.toString(),
    classType: "group_regular",
    lessonDate: new Date("2026-09-10T10:00:00Z"),
    requiredCredits: 1,
  });

  assert.equal(result.voucher?._id, reservedPlan._id);
});

test("a reservation remains subject to course, period, status and credit checks", () => {
  const future = voucher(10, 2);
  const result = resolveVoucherForLessonResult({
    vouchers: [future],
    reservedVoucherId: future._id.toString(),
    enrollmentId: studentEnrollment.toString(),
    courseId: courseId.toString(),
    classType: "group_regular",
    lessonDate: new Date("2026-09-10T10:00:00Z"),
    requiredCredits: 1,
  });

  assert.equal(result.voucher, undefined);
  assert.deepEqual(result.reasons, ["NO_VOUCHER_FOR_PERIOD"]);
});

test("Pierre regression: a stale reserved voucher falls back to the valid course voucher", () => {
  const pierreEnrollment = new Types.ObjectId();
  const pierreCourse = new Types.ObjectId();
  const staleVoucher = {
    ...voucher(7, 0, undefined),
    enrollmentId: undefined,
    courseId: undefined,
    status: "expired" as const,
    validUntil: new Date("2026-08-12T00:00:00.000Z"),
  };
  const pierreVoucher = {
    ...voucher(9, 2, undefined),
    enrollmentId: undefined,
    courseId: pierreCourse,
    validFrom: new Date("2026-09-09T00:00:00.000Z"),
    validUntil: new Date("2026-10-08T00:00:00.000Z"),
  };
  const lesson = {
    studentId: new Types.ObjectId(),
    courseId: pierreCourse,
    scheduledStart: new Date("2026-10-08T20:00:00.000Z"),
    status: "scheduled",
  };
  const result = resolveVoucherForLessonResult({
    vouchers: [staleVoucher, pierreVoucher],
    reservedVoucherId: staleVoucher._id.toString(),
    enrollmentId: pierreEnrollment.toString(),
    courseId: lesson.courseId.toString(),
    classType: "group_regular",
    lessonDate: lesson.scheduledStart,
    requiredCredits: 1,
  });

  assert.equal(result.voucher?._id, pierreVoucher._id);
  assert.deepEqual(result.reasons, []);
  const creditsAfterSettlement = (result.voucher?.creditsRemaining ?? 0) - 1;
  assert.equal(creditsAfterSettlement, 1);
});

test("an unknown reserved voucher id falls back to a usable voucher", () => {
  const usable = voucher(9, 1);
  const result = resolveVoucherForLessonResult({
    vouchers: [usable],
    reservedVoucherId: new Types.ObjectId().toString(),
    enrollmentId: studentEnrollment.toString(),
    courseId: courseId.toString(),
    classType: "group_regular",
    lessonDate: new Date("2026-09-10T10:00:00.000Z"),
    requiredCredits: 1,
  });

  assert.equal(result.voucher?._id, usable._id);
  assert.deepEqual(result.reasons, []);
});

test("legacy course-linked voucher remains supported with equivalent ObjectId strings", () => {
  const legacy = {
    ...voucher(9, 1),
    enrollmentId: undefined,
    courseId,
  };
  const selected = resolveVoucherForLesson({
    vouchers: [legacy],
    enrollmentId: new Types.ObjectId().toString(),
    courseId: new Types.ObjectId(courseId.toString()).toString(),
    classType: "group_regular",
    lessonDate: new Date("2026-09-10T10:00:00.000Z"),
    requiredCredits: 1,
  });

  assert.equal(selected?._id, legacy._id);
});

test("monthly billing periods end on the day before the next anchored period", () => {
  const september = calculateIndividualBillingPeriod({
    memberJoinedAt: new Date("2026-09-09T00:00:00.000Z"),
  });
  const october = calculateIndividualBillingPeriod({
    memberJoinedAt: september.periodStart,
    billingStartedAt: september.periodStart,
    existingBillingAnchorDay: september.billingAnchorDay,
    nextBillingDate: september.nextBillingDate,
  });

  assert.equal(september.periodStart.toISOString(), "2026-09-09T00:00:00.000Z");
  assert.equal(september.periodEnd.toISOString(), "2026-10-08T00:00:00.000Z");
  assert.equal(october.periodStart.toISOString(), "2026-10-09T00:00:00.000Z");
  assert.equal(october.periodEnd.toISOString(), "2026-11-08T00:00:00.000Z");
});

test("a stale stored anchor cannot turn a period beginning on the 9th into a 9th-to-9th period", () => {
  const period = calculateIndividualBillingPeriod({
    memberJoinedAt: new Date("2026-08-09T00:00:00.000Z"),
    billingStartedAt: new Date("2026-08-09T00:00:00.000Z"),
    existingBillingAnchorDay: 10,
    nextBillingDate: new Date("2026-09-09T00:00:00.000Z"),
  });

  assert.equal(period.billingAnchorDay, 9);
  assert.equal(period.periodStart.toISOString(), "2026-09-09T00:00:00.000Z");
  assert.equal(period.periodEnd.toISOString(), "2026-10-08T00:00:00.000Z");
  assert.equal(period.nextBillingDate.toISOString(), "2026-10-09T00:00:00.000Z");
});

test("month-end anchors clamp deterministically and return to day 31", () => {
  const january = calculateIndividualBillingPeriod({
    memberJoinedAt: new Date("2027-01-31T00:00:00.000Z"),
  });
  const february = calculateIndividualBillingPeriod({
    memberJoinedAt: january.periodStart,
    billingStartedAt: january.periodStart,
    existingBillingAnchorDay: january.billingAnchorDay,
    nextBillingDate: january.nextBillingDate,
  });
  const leapJanuary = calculateIndividualBillingPeriod({
    memberJoinedAt: new Date("2028-01-31T00:00:00.000Z"),
  });

  assert.equal(january.periodEnd.toISOString(), "2027-02-27T00:00:00.000Z");
  assert.equal(january.nextBillingDate.toISOString(), "2027-02-28T00:00:00.000Z");
  assert.equal(february.periodEnd.toISOString(), "2027-03-30T00:00:00.000Z");
  assert.equal(february.nextBillingDate.toISOString(), "2027-03-31T00:00:00.000Z");
  assert.equal(leapJanuary.nextBillingDate.toISOString(), "2028-02-29T00:00:00.000Z");
});
