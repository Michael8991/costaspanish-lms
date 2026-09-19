import assert from "node:assert/strict";
import test from "node:test";
import { buildDataset } from "../../scripts/staging/seed/dataset";
import { auditDataset } from "../../scripts/staging/seed/audit";
import { seedId } from "../../scripts/staging/seed/identity";
import { createResourceSchema } from "../../lib/validators/resource";
import { createCourseTemplateSchema } from "../../lib/validators/courseTemplate.validator";
import { createCourseProfileSchema } from "../../lib/validators/courseProfile.validator";
import { toStudentPlanListDTO } from "../../lib/dto/student.dto";
import { StudentProfile } from "../../models/StudentProfile";
import { CourseTemplate } from "../../models/CourseTemplate";
import { CourseProfile } from "../../models/CourseProfile";
import { CourseEnrollment } from "../../models/CourseEnrollment";
import { Resource } from "../../models/ResourceProfile";
import { PaymentLedgerEntry } from "../../models/PaymentLedgerEntry";
import { CreditLedgerEntry } from "../../models/CreditLedgerEntry";
import Lesson from "../../models/Lesson";
import { toCourseProfileListItemDTO } from "../../lib/utils/course-profile.mapper";

test("seed satisfies actual schemas, financial/credit invariants and API contracts", async () => {
  const data = buildDataset(seedId("teacher", 0), new Date("2026-09-19T00:00:00Z"));
  for (const [key, rows] of Object.entries(data)) {
    if (key === "anchor") continue;
    for (const doc of rows as typeof data.students) await doc.validate();
  }
  for (const resource of data.resources) createResourceSchema.parse(resource.toObject());
  for (const template of data.templates) createCourseTemplateSchema.parse(JSON.parse(JSON.stringify(template)));
  for (const course of data.courses) createCourseProfileSchema.parse({
    templateId: String(course.templateId), name: course.name, classType: course.classType,
    studentIds: course.studentIds.map(String), status: course.status,
  });
  // The API validator only covers its input shape; the full persisted course is
  // validated above as a Mongoose document, including policies and storefront.
  for (const course of data.courses) {
    assert.ok(course.policies?.creditPolicy && course.storefront?.priceOptions?.length);
    assert.ok(course.members.length && course.consumptionPolicies);
    const listed = toCourseProfileListItemDTO(course);
    assert.ok(listed.templateName && listed.level && listed.modulesCount === 2);
  }
  const report = auditDataset(data);
  assert.deepEqual(report.counts, { students: 10, templates: 4, courses: 5, enrollments: 9,
    vouchers: 10, payments: 10, lessons: 25, resources: 13, credits: 20 });
  const pierre = data.students[2].activePlans[0];
  assert.equal(pierre.creditsRemaining, 1);
  const claire = toStudentPlanListDTO(data.students[3].activePlans[0]);
  assert.equal(claire.priceTotal, 220); assert.equal(claire.amountPaid, 150); assert.equal(claire.paymentStatus, "partial");
  assert.equal(data.students[9].activePlans.length, 0);
});

test("full Mongoose hydration preserves seed graph and financial audit", () => {
  const first = buildDataset(seedId("teacher", 0), new Date("2026-09-19T00:00:00Z"));
  const hydrated = {
    ...first,
    students: first.students.map(doc => StudentProfile.hydrate(doc.toObject())),
    templates: first.templates.map(doc => CourseTemplate.hydrate(doc.toObject())),
    courses: first.courses.map(doc => CourseProfile.hydrate(doc.toObject())),
    enrollments: first.enrollments.map(doc => CourseEnrollment.hydrate(doc.toObject())),
    resources: first.resources.map(doc => Resource.hydrate(doc.toObject())),
    payments: first.payments.map(doc => PaymentLedgerEntry.hydrate(doc.toObject())),
    lessons: first.lessons.map(doc => Lesson.hydrate(doc.toObject())),
    credits: first.credits.map(doc => CreditLedgerEntry.hydrate(doc.toObject())),
  };
  assert.equal(auditDataset(hydrated).fingerprint, auditDataset(first).fingerprint);
});

test("seed IDs, graphs and UTC dates are deterministic across reruns and calendar boundaries", () => {
  for (const day of ["2026-03-29", "2026-10-25", "2026-12-31", "2027-02-01"]) {
    const first = buildDataset(seedId("teacher", 0), new Date(`${day}T00:01:00Z`));
    const second = buildDataset(seedId("teacher", 0), new Date(`${day}T23:59:00Z`));
    assert.equal(auditDataset(first).fingerprint, auditDataset(second).fingerprint);
    assert.equal(first.students[4].activePlans[0].validUntil.toISOString(), `${day}T00:00:00.000Z`);
  }
});

test("seed audit rejects financial corruption and unaccounted credit consumption", () => {
  const data = buildDataset(seedId("teacher", 0), new Date("2026-09-19T00:00:00Z"));
  data.payments[0].amountCents = 8001;
  assert.throws(() => auditDataset(data));
  data.payments[0].amountCents = 8000;
  data.students[2].activePlans[0].creditsRemaining = 2;
  assert.throws(() => auditDataset(data));
});
