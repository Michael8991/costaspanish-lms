import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { POST as createVoucherFromStudent } from "../../app/api/students/[id]/plans/route";
import {
  resolveCourseVoucherAssociation,
  withAuthoritativeCourseVoucherFields,
} from "../../lib/utils/course-context-voucher";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("student voucher POST is disabled with a stable error code", async () => {
  const response = await createVoucherFromStudent();

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "La creación de bonos desde la ficha del alumno está deshabilitada.",
    code: "student_voucher_creation_disabled",
  });
});

test("course context overrides a client-provided classType", () => {
  const result = withAuthoritativeCourseVoucherFields(
    { classType: "group_regular" },
    "intensive",
  );

  assert.equal(result.classType, "intensive");
  assert.equal(result.createdFrom, "course_profile");
});

test("course context rejects client-controlled generation provenance", () => {
  const result = withAuthoritativeCourseVoucherFields(
    {
      generatedFromCourse: true,
      generatedFromCourseMember: true,
    },
    "intensive",
  );

  assert.equal(result.generatedFromCourse, false);
  assert.equal(result.generatedFromCourseMember, false);
});

test("course context takes both association ids from the validated enrollment", () => {
  const result = resolveCourseVoucherAssociation({
    routeCourseId: "course-1",
    enrollment: {
      _id: "enrollment-1",
      courseId: "course-1",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    association: {
      enrollmentId: "enrollment-1",
      courseId: "course-1",
    },
  });
});

test("course context rejects an enrollment from another URL course", () => {
  const result = resolveCourseVoucherAssociation({
    routeCourseId: "course-1",
    enrollment: {
      _id: "enrollment-1",
      courseId: "course-2",
    },
  });

  assert.deepEqual(result, {
    ok: false,
    code: "course_enrollment_mismatch",
    error: "La matrícula seleccionada no pertenece a este curso.",
    status: 409,
  });
});

test("student screens expose no voucher creation entry point", () => {
  const studentSources = [
    source("components/dashboard/teacher/students/BasicStudentHeader.tsx"),
    source("components/dashboard/teacher/students/ActiveVouchersPanel.tsx"),
  ];

  for (const studentSource of studentSources) {
    assert.doesNotMatch(studentSource, /Add New Voucher/);
    assert.doesNotMatch(studentSource, /<NewVoucherForm/);
    assert.doesNotMatch(studentSource, /handleNewVoucher/);
    assert.doesNotMatch(studentSource, /method:\s*["']POST["']/);
  }
});

test("student voucher history and existing voucher editing remain available", () => {
  const header = source(
    "components/dashboard/teacher/students/BasicStudentHeader.tsx",
  );
  const panel = source(
    "components/dashboard/teacher/students/ActiveVouchersPanel.tsx",
  );
  const collectionRoute = source("app/api/students/[id]/plans/route.ts");
  const voucherRoute = source(
    "app/api/students/[id]/plans/[planId]/route.ts",
  );

  assert.match(header, /Vouchers History/);
  assert.match(panel, /See Full Vouchers History/);
  assert.match(panel, /EditVoucherForm/);
  assert.match(collectionRoute, /export async function GET/);
  assert.match(voucherRoute, /export async function PATCH/);
});

test("FirstStep creates through a course-scoped endpoint", () => {
  const firstStep = source(
    "components/dashboard/lessons/add/FirstStepAddLesson.tsx",
  );

  assert.match(
    firstStep,
    /\/api\/course\/\$\{courseId\}\/members\/\$\{quickVoucherTarget\.studentId\}\/vouchers/,
  );
  assert.doesNotMatch(
    firstStep,
    /\/api\/students\/\$\{quickVoucherTarget\.studentId\}\/plans/,
  );
});

test("course-scoped creation derives classType and validates the enrollment course", () => {
  const route = source(
    "app/api/course/[id]/members/[studentId]/vouchers/route.ts",
  );

  assert.match(route, /classType: course\.classType/);
  assert.match(route, /createdFrom: "course_profile"/);
  assert.match(route, /resolveCourseVoucherAssociation/);
  assert.match(route, /generatedFromCourse: false/);
  assert.match(route, /generatedFromCourseMember: false/);
});

test("CourseProfile generation keeps its dedicated endpoint", () => {
  const modal = source(
    "components/dashboard/courses/CreateCourseVouchersModal.tsx",
  );

  assert.match(
    modal,
    /\/api\/course\/\$\{course\.id\}\/vouchers\/generate/,
  );
});
