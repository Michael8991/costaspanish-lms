import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

import {
  CourseCreationError,
  createCourseFromTemplateAtomic,
  type CourseCreationEnrollment,
  type CourseCreationProjectionMember,
  type CourseCreationRepository,
  type CourseCreationTransaction,
} from "../../lib/services/course-creation.service";
import { updateCourseProfileSchema } from "../../lib/validators/courseProfile.validator";

type StoredCourse = Record<string, unknown> & {
  _id: Types.ObjectId;
  studentIds?: Types.ObjectId[];
  members?: CourseCreationProjectionMember[];
  stats?: { activeEnrollmentCount?: number; lessonCount?: number };
};

class FakeCourseCreationRepository implements CourseCreationRepository {
  courses: StoredCourse[] = [];
  initialCourses: StoredCourse[] = [];
  enrollments: CourseCreationEnrollment[] = [];
  writeCalls = 0;

  constructor(private readonly failAt?: "enrollments" | "projection") {}

  async withTransaction(
    work: (transaction: CourseCreationTransaction) => Promise<void>,
  ) {
    const stagedCourses: StoredCourse[] = [];
    const stagedEnrollments: CourseCreationEnrollment[] = [];
    const transaction: CourseCreationTransaction = {
      createCourse: async (course) => {
        this.writeCalls += 1;
        const storedCourse = course as StoredCourse;
        this.initialCourses.push({
          ...storedCourse,
          studentIds: [...(storedCourse.studentIds ?? [])],
          members: [...(storedCourse.members ?? [])],
          stats: { ...storedCourse.stats },
        });
        stagedCourses.push(storedCourse);
      },
      createEnrollments: async (enrollments) => {
        this.writeCalls += 1;
        stagedEnrollments.push(...enrollments);
        if (this.failAt === "enrollments") throw new Error("enrollment write failed");
      },
      projectMembership: async ({ courseId, studentIds, members }) => {
        this.writeCalls += 1;
        if (this.failAt === "projection") throw new Error("projection write failed");
        const course = stagedCourses.find((item) => item._id.equals(courseId));
        if (!course) throw new Error("course missing");
        course.studentIds = studentIds;
        course.members = members;
        course.stats = {
          ...course.stats,
          activeEnrollmentCount: studentIds.length,
        };
      },
    };

    await work(transaction);
    this.courses.push(...stagedCourses);
    this.enrollments.push(...stagedEnrollments);
  }
}

function fixture(repository: CourseCreationRepository, overrides?: {
  students?: Array<{ _id: Types.ObjectId; isActive?: boolean }>;
  memberIds?: Types.ObjectId[];
  maxStudents?: number;
  classType?: "private" | "pair" | "group_regular";
}) {
  const memberIds = overrides?.memberIds ?? [new Types.ObjectId(), new Types.ObjectId()];
  const enrolledAt = new Date("2026-10-14T09:00:00.000Z");
  return createCourseFromTemplateAtomic({
    course: {
      _id: new Types.ObjectId(),
      name: "Curso nuevo",
      stats: { activeEnrollmentCount: 99, lessonCount: 0 },
      studentIds: [new Types.ObjectId()],
      members: [{ unsafe: "must be cleared" }],
    },
    members: memberIds.map((studentId) => ({
      studentId,
      billing: {
        mode: "individual_cycle" as const,
        notes: `billing-${studentId.toString()}`,
      },
    })),
    students: overrides?.students ?? memberIds.map((_id) => ({ _id, isActive: true })),
    classType: overrides?.classType ?? "group_regular",
    maxStudents: overrides?.maxStudents ?? 10,
    enrolledAt,
    repository,
  });
}

test("create from template writes the course, active enrollments and projection atomically", async () => {
  const repository = new FakeCourseCreationRepository();

  await fixture(repository);

  assert.equal(repository.courses.length, 1);
  assert.deepEqual(repository.initialCourses[0]?.studentIds, []);
  assert.deepEqual(repository.initialCourses[0]?.members, []);
  assert.equal(repository.initialCourses[0]?.stats?.activeEnrollmentCount, 0);
  assert.equal(repository.enrollments.length, 2);
  assert.ok(repository.enrollments.every((item) => item.status === "active"));
  assert.equal(repository.courses[0]?.studentIds?.length, 2);
  assert.equal(repository.courses[0]?.members?.length, 2);
  assert.equal(repository.courses[0]?.stats?.activeEnrollmentCount, 2);
  assert.deepEqual(
    repository.courses[0]?.studentIds?.map(String),
    repository.enrollments.map((item) => item.studentId.toString()),
  );
});

test("inactive student fails preflight with zero writes", async () => {
  const repository = new FakeCourseCreationRepository();
  const studentId = new Types.ObjectId();

  await assert.rejects(
    fixture(repository, {
      memberIds: [studentId],
      students: [{ _id: studentId, isActive: false }],
    }),
    (error: unknown) =>
      error instanceof CourseCreationError && error.code === "INACTIVE_STUDENT",
  );
  assert.equal(repository.writeCalls, 0);
  assert.deepEqual(repository.courses, []);
  assert.deepEqual(repository.enrollments, []);
});

test("invalid cloned-policy capacity fails preflight with zero writes", async () => {
  const repository = new FakeCourseCreationRepository();

  await assert.rejects(
    fixture(repository, { maxStudents: 1 }),
    (error: unknown) =>
      error instanceof CourseCreationError &&
      error.code === "POLICY_CAPACITY_EXCEEDED",
  );
  assert.equal(repository.writeCalls, 0);
  assert.deepEqual(repository.courses, []);
  assert.deepEqual(repository.enrollments, []);
});

for (const failAt of ["enrollments", "projection"] as const) {
  test(`transaction rolls back the whole batch when ${failAt} write fails`, async () => {
    const repository = new FakeCourseCreationRepository(failAt);

    await assert.rejects(fixture(repository), /write failed/);
    assert.deepEqual(repository.courses, []);
    assert.deepEqual(repository.enrollments, []);
  });
}

test("course PATCH schema rejects membership fields", () => {
  const studentId = new Types.ObjectId().toString();

  for (const body of [
    { studentIds: [studentId] },
    { members: [{ studentId }] },
  ]) {
    const parsed = updateCourseProfileSchema.safeParse(body);
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.issues.some((issue) => issue.code === "unrecognized_keys"));
    }
  }
});
