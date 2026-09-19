import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { SeedDataset } from "./dataset";
import type { ICourseMember } from "../../../models/CourseProfile";

export function canonicalJson(value: unknown): string {
  const normalized = JSON.parse(JSON.stringify(value));
  function sort(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input)
      .filter(([key]) => !["createdAt", "updatedAt", "__v"].includes(key))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sort(item)]));
    return input;
  }
  return JSON.stringify(sort(normalized));
}

export function auditDataset(data: SeedDataset) {
  const { students, courses, enrollments, payments, lessons, credits, resources, templates } = data;
  const plans = students.flatMap(student => student.activePlans);
  const byId = <T extends { _id: unknown }>(rows: T[]) => new Map(rows.map(row => [String(row._id), row]));
  const studentMap = byId(students), courseMap = byId(courses), planMap = byId(plans), lessonMap = byId(lessons);
  const resourceMap = byId(resources), templateMap = byId(templates), enrollmentMap = byId(enrollments);
  for (const student of students) for (const plan of student.activePlans) {
    assert.ok(Number.isSafeInteger(plan.priceTotalCents) && plan.priceTotalCents! >= 0, `Invalid price: ${plan._id}`);
    assert.ok(Number.isSafeInteger(plan.amountPaidCents) && plan.amountPaidCents! >= 0, `Invalid paid amount: ${plan._id}`);
    assert.equal(plan.price, plan.priceTotalCents! / 100);
    assert.equal(plan.priceTotal, plan.price);
    assert.equal(plan.amountPaid, plan.amountPaidCents! / 100);
    assert.ok(plan.amountPaidCents! <= plan.priceTotalCents!);
    const active = payments.filter(payment => payment.voucherId.equals(plan._id) && payment.status === "active");
    assert.equal(active.reduce((sum, payment) => sum + payment.amountCents!, 0), plan.amountPaidCents, `Ledger mismatch: ${plan._id}`);
    assert.equal(plan.paymentStatus, !plan.amountPaidCents ? "pending" : plan.amountPaidCents === plan.priceTotalCents ? "paid" : "partial");
    if (plan.paymentStatus === "pending") {
      assert.equal(active.length, 0); assert.equal(plan.paidAt, null); assert.equal(plan.paymentMethod, "");
    } else {
      const last = [...active].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime()).at(-1)!;
      assert.equal(plan.paidAt?.getTime(), last.paidAt.getTime()); assert.equal(plan.paymentMethod, last.paymentMethod);
    }
    const enrollment = enrollmentMap.get(String(plan.enrollmentId));
    assert.ok(enrollment && enrollment.studentId.equals(student._id) && enrollment.courseId.equals(plan.courseId));
    assert.ok(courseMap.has(String(plan.courseId)));
    assert.ok(plan.validUntil >= plan.validFrom);
    assert.equal(plan.validFrom.getUTCHours(), 0); assert.equal(plan.validUntil.getUTCHours(), 0);
    const consumed = credits.filter(credit => credit.voucherId?.equals(plan._id) && credit.status === "active")
      .reduce((sum, credit) => sum + credit.creditsConsumed, 0);
    assert.equal(plan.creditsRemaining, plan.creditsTotal! - consumed, `Credit balance mismatch: ${plan._id}`);
    assert.ok(plan.creditsRemaining! >= 0);
    if (plan.creditsRemaining === 0) assert.equal(plan.status, "exhausted");
  }
  for (const payment of payments) {
    assert.ok(Number.isSafeInteger(payment.amountCents) && payment.amountCents! > 0);
    assert.equal(payment.amount, payment.amountCents! / 100);
    const plan = planMap.get(String(payment.voucherId));
    const student = studentMap.get(String(payment.studentId));
    assert.ok(plan && student && student.activePlans.some(item => item._id.equals(plan._id)));
    assert.equal(payment.studentNameSnapshot, student.fullName);
    assert.equal(payment.voucherNameSnapshot, plan.name);
    assert.equal(String(payment.courseId), String(plan.courseId));
    assert.equal(payment.courseNameSnapshot, plan.courseNameSnapshot);
  }
  assert.equal(new Set(payments.map(payment => payment.idempotencyKey)).size, payments.length);
  for (const course of courses) {
    assert.ok(templateMap.has(String(course.templateId)));
    const active = enrollments.filter(row => row.courseId.equals(course._id) && row.status === "active");
    const ids = active.map(row => String(row.studentId)).sort();
    assert.ok(ids.length <= course.policies!.participantPolicy.maxStudents);
    assert.deepEqual(course.studentIds!.map(String).sort(), ids);
    assert.deepEqual(course.members.filter((member: ICourseMember) => member.status === "active").map((member: ICourseMember) => String(member.studentId)).sort(), ids);
    for (const member of course.members) {
      assert.ok(studentMap.has(String(member.studentId)));
      assert.ok(planMap.has(String(member.billing.firstVoucherId)) && planMap.has(String(member.billing.lastVoucherId)));
    }
  }
  const running = new Map(plans.map(plan => [String(plan._id), plan.creditsTotal!]));
  for (const lesson of [...lessons].sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())) {
    assert.ok(lesson.scheduledEnd > lesson.scheduledStart);
    if (lesson.courseId) assert.ok(courseMap.has(String(lesson.courseId)));
    for (const attendee of lesson.attendees) {
      assert.ok(studentMap.has(String(attendee.studentId)));
      if (attendee.isTrial) continue;
      const plan = planMap.get(String(attendee.voucherId));
      assert.ok(plan && String(plan.courseId) === String(lesson.courseId));
      assert.ok(studentMap.get(String(attendee.studentId))!.activePlans.some(item => item._id.equals(plan._id)));
      const day = new Date(lesson.scheduledStart); day.setUTCHours(0, 0, 0, 0);
      assert.ok(plan.validFrom <= day && plan.validUntil >= day, `Lesson outside voucher dates: ${lesson._id}`);
    }
    for (const block of lesson.blocks) for (const resource of block.resources) assert.ok(resourceMap.has(String(resource)));
    if (lesson.status === "completed") {
      assert.equal(lesson.creditSettlement?.status, "settled");
      let total = 0;
      for (const item of lesson.creditSettlement.items) {
        total += item.creditsConsumed;
        if (!item.voucherId) { assert.equal(item.creditsConsumed, 0); continue; }
        const key = String(item.voucherId);
        assert.equal(item.previousCreditsRemaining, running.get(key));
        running.set(key, running.get(key)! - item.creditsConsumed);
        assert.equal(item.newCreditsRemaining, running.get(key));
        const rows = credits.filter(row => row.lessonId.equals(lesson._id) && row.studentId.equals(item.studentId));
        assert.equal(rows.reduce((sum, row) => sum + row.creditsConsumed, 0), item.creditsConsumed);
      }
      assert.equal(lesson.creditSettlement.totalCreditsConsumed, total);
    }
  }
  for (const credit of credits) assert.ok(lessonMap.has(String(credit.lessonId)) && planMap.has(String(credit.voucherId)));
  for (const resource of resources) { assert.equal(resource.format, "external_link"); assert.ok(resource.externalUrl); assert.ok(!resource.storagePath && !resource.fileUrl); }
  for (const template of templates) for (const curriculumModule of template.curriculum?.modules ?? [])
    for (const lesson of curriculumModule.lessons ?? []) for (const block of lesson.blocks ?? [])
      for (const resource of block.resources ?? []) assert.ok(resourceMap.has(String(resource)));
  const counts = { students: students.length, templates: templates.length, courses: courses.length, enrollments: enrollments.length,
    vouchers: plans.length, payments: payments.length, lessons: lessons.length, resources: resources.length, credits: credits.length };
  const content = Object.fromEntries(Object.entries(data).filter(([key]) => key !== "anchor")
    .map(([key, rows]) => [key, [...rows as { _id: unknown }[]].sort((a, b) => String(a._id).localeCompare(String(b._id)))]));
  return { counts, anomalies: 0, fingerprint: createHash("sha256").update(canonicalJson(content)).digest("hex") };
}
