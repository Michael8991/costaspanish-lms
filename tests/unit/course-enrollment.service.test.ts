import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import {
  buildLegacyEnrollmentBulkOperations,
  CourseEnrollmentError,
  createCourseEnrollmentService,
  type CourseEnrollmentRepository,
  type EnrollmentCourseRecord,
  type EnrollmentRecord,
  type EnrollmentStudentRecord,
} from "../../lib/services/course-enrollment.service";
import { enrollStudentSchema } from "../../lib/validators/course-enrollment";
import { CourseEnrollment } from "../../models/CourseEnrollment";

const teacherId = new Types.ObjectId();
const otherTeacherId = new Types.ObjectId();
const courseId = new Types.ObjectId();
const studentId = new Types.ObjectId();

function activeCourse(): EnrollmentCourseRecord {
  return {
    _id: courseId,
    ownerTeacherId: teacherId,
    status: "active",
    classType: "group_regular",
    members: [],
    studentIds: [],
  };
}

function activeStudent(): EnrollmentStudentRecord {
  return {
    _id: studentId,
    teacherId,
    fullName: "María García",
    contactEmail: "maria@example.com",
    isActive: true,
  };
}

class FakeEnrollmentRepository implements CourseEnrollmentRepository {
  course: EnrollmentCourseRecord | null = activeCourse();
  student: EnrollmentStudentRecord | null = activeStudent();
  enrollments: EnrollmentRecord[] = [];
  duplicateOnCreate = false;
  projectionWasSynced = false;

  async findCourse() {
    return this.course;
  }

  async findStudent() {
    return this.student;
  }

  async findEnrollment() {
    return this.enrollments[0] ?? null;
  }

  async createEnrollment(input: {
    courseId: Types.ObjectId;
    studentId: Types.ObjectId;
    status: "active";
    enrolledAt: Date;
  }) {
    if (this.duplicateOnCreate) {
      throw { code: 11000 };
    }
    const enrollment: EnrollmentRecord = {
      _id: new Types.ObjectId(),
      ...input,
    };
    this.enrollments.push(enrollment);
    return enrollment;
  }

  async deleteEnrollment(enrollmentId: string) {
    this.enrollments = this.enrollments.filter(
      (enrollment) => String(enrollment._id) !== enrollmentId,
    );
  }

  async listEnrollments() {
    return this.enrollments;
  }

  async backfillLegacyEnrollments() {}

  async syncLegacyCourseProjection() {
    this.projectionWasSynced = true;
  }

  async countActiveEnrollments() {
    return this.enrollments.filter(
      (enrollment) => enrollment.status === "active",
    ).length;
  }

  async updateActiveEnrollmentCount() {}
}

const actor = { id: teacherId.toHexString(), role: "teacher" as const };

async function expectEnrollmentError(
  operation: Promise<unknown>,
  code: CourseEnrollmentError["code"],
) {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof CourseEnrollmentError);
    assert.equal(error.code, code);
    return true;
  });
}

test("teacher enrolls a valid student and receives a clean DTO", async () => {
  const repository = new FakeEnrollmentRepository();
  const service = createCourseEnrollmentService(repository);

  const result = await service.enrollStudentInCourse({
    courseId: courseId.toHexString(),
    studentId: studentId.toHexString(),
    actor,
  });

  assert.equal(result.courseId, courseId.toHexString());
  assert.equal(result.student.id, studentId.toHexString());
  assert.equal(result.student.name, "María García");
  assert.equal(result.student.email, "maria@example.com");
  assert.equal(result.status, "active");
  assert.equal(repository.enrollments.length, 1);
  assert.equal(repository.projectionWasSynced, true);
});

test("an existing enrollment is rejected", async () => {
  const repository = new FakeEnrollmentRepository();
  repository.enrollments = [
    {
      _id: new Types.ObjectId(),
      courseId,
      studentId,
      status: "active",
      enrolledAt: new Date(),
    },
  ];
  const service = createCourseEnrollmentService(repository);

  await expectEnrollmentError(
    service.enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "ALREADY_ENROLLED",
  );
});

test("the unique-index race is translated to a domain conflict", async () => {
  const repository = new FakeEnrollmentRepository();
  repository.duplicateOnCreate = true;
  const service = createCourseEnrollmentService(repository);

  await expectEnrollmentError(
    service.enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "ALREADY_ENROLLED",
  );
});

test("a missing student is rejected", async () => {
  const repository = new FakeEnrollmentRepository();
  repository.student = null;
  const service = createCourseEnrollmentService(repository);

  await expectEnrollmentError(
    service.enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "STUDENT_NOT_FOUND",
  );
});

test("a missing course is rejected", async () => {
  const repository = new FakeEnrollmentRepository();
  repository.course = null;
  const service = createCourseEnrollmentService(repository);

  await expectEnrollmentError(
    service.enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "COURSE_NOT_FOUND",
  );
});

test("students cannot manage course enrollments", async () => {
  const repository = new FakeEnrollmentRepository();
  const service = createCourseEnrollmentService(repository);

  await expectEnrollmentError(
    service.enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor: { id: studentId.toHexString(), role: "student" },
    }),
    "FORBIDDEN",
  );
});

test("a teacher cannot manage another teacher's course", async () => {
  const repository = new FakeEnrollmentRepository();
  repository.course = {
    ...activeCourse(),
    ownerTeacherId: otherTeacherId,
  };
  const service = createCourseEnrollmentService(repository);

  await expectEnrollmentError(
    service.enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "FORBIDDEN",
  );
});

test("inactive students and archived courses cannot receive enrollments", async () => {
  const inactiveRepository = new FakeEnrollmentRepository();
  inactiveRepository.student = { ...activeStudent(), isActive: false };
  await expectEnrollmentError(
    createCourseEnrollmentService(inactiveRepository).enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "STUDENT_INACTIVE",
  );

  const archivedRepository = new FakeEnrollmentRepository();
  archivedRepository.course = { ...activeCourse(), status: "archived" };
  await expectEnrollmentError(
    createCourseEnrollmentService(archivedRepository).enrollStudentInCourse({
      courseId: courseId.toHexString(),
      studentId: studentId.toHexString(),
      actor,
    }),
    "COURSE_ARCHIVED",
  );
});

test("listing returns only enrollment DTO fields", async () => {
  const repository = new FakeEnrollmentRepository();
  repository.enrollments = [
    {
      _id: new Types.ObjectId(),
      courseId,
      studentId: activeStudent(),
      status: "active",
      enrolledAt: new Date("2026-09-01T10:00:00.000Z"),
    },
  ];
  const service = createCourseEnrollmentService(repository);

  const result = await service.listCourseEnrollments({
    courseId: courseId.toHexString(),
    actor,
  });

  assert.equal(result.length, 1);
  assert.deepEqual(Object.keys(result[0]).sort(), [
    "courseId",
    "enrolledAt",
    "enrollmentId",
    "id",
    "status",
    "student",
    "studentId",
  ]);
  assert.deepEqual(result[0].student, {
    id: studentId.toHexString(),
    name: "María García",
    email: "maria@example.com",
  });
});

test("the enrollment payload rejects invalid ids and arbitrary fields", () => {
  assert.equal(enrollStudentSchema.safeParse({ studentId: "invalid" }).success, false);
  assert.equal(
    enrollStudentSchema.safeParse({
      studentId: studentId.toHexString(),
      status: "inactive",
    }).success,
    false,
  );
});

test("the application service rejects invalid ids", async () => {
  const repository = new FakeEnrollmentRepository();
  await expectEnrollmentError(
    createCourseEnrollmentService(repository).enrollStudentInCourse({
      courseId: "invalid",
      studentId: studentId.toHexString(),
      actor,
    }),
    "INVALID_ID",
  );
});

test("legacy backfill operations are idempotent and preserve domain dates", () => {
  const joinedAt = new Date("2024-03-12T09:30:00.000Z");
  const course = {
    ...activeCourse(),
    members: [
      { studentId, status: "active", joinedAt },
      { studentId, status: "active", joinedAt },
    ],
  };

  const firstRun = buildLegacyEnrollmentBulkOperations(course);
  const secondRun = buildLegacyEnrollmentBulkOperations(course);

  assert.equal(firstRun.length, 1);
  assert.equal(secondRun.length, 1);
  assert.deepEqual(firstRun[0].updateOne.filter, {
    courseId,
    studentId,
  });
  assert.equal(firstRun[0].updateOne.upsert, true);
  assert.equal(
    firstRun[0].updateOne.update.$setOnInsert.enrolledAt.getTime(),
    joinedAt.getTime(),
  );
  assert.equal("$set" in firstRun[0].updateOne.update, false);
  assert.equal(
    "createdAt" in firstRun[0].updateOne.update.$setOnInsert,
    false,
  );
  assert.equal(
    "updatedAt" in firstRun[0].updateOne.update.$setOnInsert,
    false,
  );
});

test("Mongoose adds CourseEnrollment timestamps without conflicting paths", async () => {
  assert.equal(CourseEnrollment.schema.options.timestamps, true);

  const capturedOperations: Array<Record<string, unknown>> = [];
  const collection = CourseEnrollment.collection as typeof CourseEnrollment.collection & {
    bulkWrite: (...args: unknown[]) => Promise<unknown>;
  };
  const originalBulkWrite = collection.bulkWrite;
  collection.bulkWrite = (async (operations: Array<Record<string, unknown>>) => {
    capturedOperations.push(...operations);
    return {};
  }) as typeof collection.bulkWrite;

  try {
    await CourseEnrollment.bulkWrite(
      buildLegacyEnrollmentBulkOperations({
        ...activeCourse(),
        members: [
          {
            studentId,
            status: "active",
            joinedAt: new Date("2024-03-12T09:30:00.000Z"),
          },
        ],
      }),
    );
  } finally {
    collection.bulkWrite = originalBulkWrite;
  }

  assert.equal(capturedOperations.length, 1);
  const operation = capturedOperations[0] as {
    updateOne: {
      update: {
        $set: { updatedAt?: unknown };
        $setOnInsert: { createdAt?: unknown; updatedAt?: unknown };
      };
    };
  };
  assert.ok(operation.updateOne.update.$set.updatedAt instanceof Date);
  assert.ok(
    operation.updateOne.update.$setOnInsert.createdAt instanceof Date,
  );
  assert.equal(
    operation.updateOne.update.$setOnInsert.updatedAt,
    undefined,
  );
});
