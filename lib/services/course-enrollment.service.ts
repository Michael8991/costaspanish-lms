import { Types } from "mongoose";

import {
  toCourseEnrollmentDTO,
  type CourseEnrollmentListItemDTO,
  type CourseEnrollmentSource,
  type CourseEnrollmentStudentSource,
} from "@/lib/dto/course-enrollment.dto";
import type { Role } from "@/lib/auth/apiAuth";
import { CourseEnrollment } from "@/models/CourseEnrollment";
import { CourseProfile } from "@/models/CourseProfile";
import { StudentProfile } from "@/models/StudentProfile";

export type EnrollmentActor = { id: string; role: Role };

export type EnrollmentCourseRecord = {
  _id: Types.ObjectId;
  ownerTeacherId: Types.ObjectId;
  status: string;
  classType?: string;
  policies?: { participantPolicy?: { maxStudents?: number } } | null;
  privateFlexiblePolicy?: { maxStudents?: number } | null;
  publicationMeta?: { maxStudents?: number } | null;
  createdAt?: Date;
  startDate?: Date | null;
  studentIds?: unknown[];
  members?: Array<{
    studentId?: unknown;
    status?: string;
    joinedAt?: Date | string | null;
  }>;
};

export type EnrollmentStudentRecord = CourseEnrollmentStudentSource & {
  teacherId?: unknown;
  isActive?: boolean;
};

export type EnrollmentRecord = CourseEnrollmentSource;

export type CreateEnrollmentRecord = {
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: "active";
  enrolledAt: Date;
};

export interface CourseEnrollmentRepository {
  findCourse(courseId: Types.ObjectId): Promise<EnrollmentCourseRecord | null>;
  findStudent(studentId: Types.ObjectId): Promise<EnrollmentStudentRecord | null>;
  findEnrollment(
    courseId: Types.ObjectId,
    studentId: Types.ObjectId,
  ): Promise<EnrollmentRecord | null>;
  createEnrollment(input: CreateEnrollmentRecord): Promise<EnrollmentRecord>;
  deleteEnrollment(enrollmentId: string): Promise<void>;
  listEnrollments(courseId: Types.ObjectId): Promise<EnrollmentRecord[]>;
  backfillLegacyEnrollments(course: EnrollmentCourseRecord): Promise<void>;
  syncLegacyCourseProjection(input: {
    courseId: Types.ObjectId;
    studentId: Types.ObjectId;
    enrolledAt: Date;
  }): Promise<void>;
  countActiveEnrollments(courseId: Types.ObjectId): Promise<number>;
  updateActiveEnrollmentCount(
    courseId: Types.ObjectId,
    activeCount: number,
  ): Promise<void>;
}

export type CourseEnrollmentErrorCode =
  | "INVALID_ID"
  | "FORBIDDEN"
  | "COURSE_NOT_FOUND"
  | "STUDENT_NOT_FOUND"
  | "STUDENT_INACTIVE"
  | "COURSE_ARCHIVED"
  | "ALREADY_ENROLLED"
  | "COURSE_CAPACITY_REACHED"
  | "PERSISTENCE_ERROR";

const ERROR_STATUS: Record<CourseEnrollmentErrorCode, number> = {
  INVALID_ID: 400,
  FORBIDDEN: 403,
  COURSE_NOT_FOUND: 404,
  STUDENT_NOT_FOUND: 404,
  STUDENT_INACTIVE: 409,
  COURSE_ARCHIVED: 409,
  ALREADY_ENROLLED: 409,
  COURSE_CAPACITY_REACHED: 409,
  PERSISTENCE_ERROR: 500,
};

export class CourseEnrollmentError extends Error {
  readonly status: number;

  constructor(
    readonly code: CourseEnrollmentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CourseEnrollmentError";
    this.status = ERROR_STATUS[code];
  }
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function toObjectId(value: unknown): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === "string" && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  if (typeof value === "object" && value !== null && "_id" in value) {
    return toObjectId(value._id);
  }
  return null;
}

function legacyEnrollmentSources(course: EnrollmentCourseRecord) {
  const fallbackDate = course.startDate ?? course.createdAt ?? new Date();
  const members = Array.isArray(course.members) ? course.members : [];

  if (members.length > 0) {
    return members.flatMap((member) => {
      const studentId = toObjectId(member.studentId);
      if (!studentId) return [];
      const joinedAt = member.joinedAt ? new Date(member.joinedAt) : fallbackDate;

      return [{
        studentId,
        status: member.status === "active" ? "active" as const : "inactive" as const,
        enrolledAt: Number.isNaN(joinedAt.getTime()) ? fallbackDate : joinedAt,
      }];
    });
  }

  return (course.studentIds ?? []).flatMap((value) => {
    const studentId = toObjectId(value);
    return studentId
      ? [{ studentId, status: "active" as const, enrolledAt: fallbackDate }]
      : [];
  });
}

export function buildLegacyEnrollmentBulkOperations(
  course: EnrollmentCourseRecord,
) {
  const sources = Array.from(
    new Map(
      legacyEnrollmentSources(course).map((source) => [
        source.studentId.toHexString(),
        source,
      ]),
    ).values(),
  );
  const now = new Date();

  return sources.map((source) => ({
    updateOne: {
      filter: { courseId: course._id, studentId: source.studentId },
      update: {
        $setOnInsert: {
          courseId: course._id,
          studentId: source.studentId,
          status: source.status,
          enrolledAt: source.enrolledAt,
          unenrolledAt: source.status === "inactive" ? now : null,
        },
      },
      upsert: true,
    },
  }));
}

export const mongooseCourseEnrollmentRepository: CourseEnrollmentRepository = {
  async findCourse(courseId) {
    return CourseProfile.findById(courseId)
      .select(
        "ownerTeacherId status classType policies.participantPolicy.maxStudents privateFlexiblePolicy.maxStudents publicationMeta.maxStudents createdAt startDate studentIds members.studentId members.status members.joinedAt",
      )
      .lean<EnrollmentCourseRecord>();
  },

  async findStudent(studentId) {
    return StudentProfile.findById(studentId)
      .select("_id teacherId fullName contactEmail isActive")
      .lean<EnrollmentStudentRecord>();
  },

  async findEnrollment(courseId, studentId) {
    return CourseEnrollment.findOne({ courseId, studentId })
      .lean<EnrollmentRecord>();
  },

  async createEnrollment(input) {
    const enrollment = await CourseEnrollment.create(input);
    return enrollment.toObject() as EnrollmentRecord;
  },

  async deleteEnrollment(enrollmentId) {
    await CourseEnrollment.deleteOne({ _id: enrollmentId });
  },

  async listEnrollments(courseId) {
    const enrollments = await CourseEnrollment.find({ courseId })
      .sort({ enrolledAt: -1, _id: -1 })
      .lean<EnrollmentRecord[]>();
    const studentIds = enrollments.flatMap((enrollment) => {
      const studentId = toObjectId(enrollment.studentId);
      return studentId ? [studentId] : [];
    });
    const students = await StudentProfile.find({ _id: { $in: studentIds } })
      .select("_id fullName contactEmail")
      .lean<EnrollmentStudentRecord[]>();
    const studentsById = new Map(
      students.map((student) => [String(student._id), student]),
    );

    return enrollments.map((enrollment) => ({
      ...enrollment,
      studentId:
        studentsById.get(String(enrollment.studentId)) ?? enrollment.studentId,
    }));
  },

  async backfillLegacyEnrollments(course) {
    const operations = buildLegacyEnrollmentBulkOperations(course);
    if (operations.length === 0) return;

    try {
      await CourseEnrollment.bulkWrite(
        operations,
        { ordered: false },
      );
    } catch (error) {
      // Concurrent lazy migrations may race on the unique compound index. The
      // desired enrollment exists in that case, so the operation can proceed.
      if (!isDuplicateKeyError(error)) throw error;
    }
  },

  async syncLegacyCourseProjection({ courseId, studentId, enrolledAt }) {
    const result = await CourseProfile.updateOne(
      { _id: courseId, "members.studentId": { $ne: studentId } },
      {
        $addToSet: { studentIds: studentId },
        $push: {
          members: {
            studentId,
            status: "active",
            joinedAt: enrolledAt,
            leftAt: null,
            billing: {
              mode: "individual_cycle",
              billingAnchorDay: enrolledAt.getUTCDate(),
              billingStartedAt: null,
              nextBillingDate: null,
              firstVoucherId: null,
              lastVoucherId: null,
              notes: "",
            },
          },
        },
      },
    );

    if (result.matchedCount !== 1) {
      throw new Error("Course projection could not be updated");
    }
  },

  async countActiveEnrollments(courseId) {
    const studentIds = await CourseEnrollment.distinct("studentId", {
      courseId,
      status: "active",
    });
    return studentIds.length;
  },

  async updateActiveEnrollmentCount(courseId, activeCount) {
    await CourseProfile.updateOne(
      { _id: courseId },
      { $set: { "stats.activeEnrollmentCount": activeCount } },
    );
  },
};

export function getCourseCapacity(course: EnrollmentCourseRecord): number | null {
  const candidates = [
    course.policies?.participantPolicy?.maxStudents,
    course.privateFlexiblePolicy?.maxStudents,
    course.publicationMeta?.maxStudents,
    course.classType === "private" ? 1 : undefined,
    course.classType === "pair" ? 2 : undefined,
  ].filter(
    (value): value is number =>
      typeof value === "number" && Number.isInteger(value) && value > 0,
  );

  // The course policy snapshot is authoritative. Older capacity fields are
  // fallbacks, not additional limits to combine with the current policy.
  return candidates[0] ?? null;
}

function assertActor(actor: EnrollmentActor) {
  if (
    (actor.role !== "teacher" && actor.role !== "admin") ||
    !Types.ObjectId.isValid(actor.id)
  ) {
    throw new CourseEnrollmentError(
      "FORBIDDEN",
      "No tienes permisos para gestionar matrículas.",
    );
  }
}

function parseEnrollmentIds(courseId: string, studentId?: string) {
  if (
    !Types.ObjectId.isValid(courseId) ||
    (studentId !== undefined && !Types.ObjectId.isValid(studentId))
  ) {
    throw new CourseEnrollmentError(
      "INVALID_ID",
      "El identificador del curso o del alumno no es válido.",
    );
  }

  return {
    courseObjectId: new Types.ObjectId(courseId),
    studentObjectId:
      studentId === undefined ? null : new Types.ObjectId(studentId),
  };
}

function assertCourseAccess(
  course: EnrollmentCourseRecord | null,
  actor: EnrollmentActor,
): asserts course is EnrollmentCourseRecord {
  if (!course) {
    throw new CourseEnrollmentError(
      "COURSE_NOT_FOUND",
      "El curso no existe.",
    );
  }

  if (
    actor.role !== "admin" &&
    String(course.ownerTeacherId) !== actor.id
  ) {
    throw new CourseEnrollmentError(
      "FORBIDDEN",
      "No tienes permiso para gestionar este curso.",
    );
  }
}

export function createCourseEnrollmentService(
  repository: CourseEnrollmentRepository = mongooseCourseEnrollmentRepository,
) {
  return {
    async enrollStudentInCourse(input: {
      courseId: string;
      studentId: string;
      actor: EnrollmentActor;
    }): Promise<CourseEnrollmentListItemDTO> {
      assertActor(input.actor);
      const { courseObjectId, studentObjectId } = parseEnrollmentIds(
        input.courseId,
        input.studentId,
      );
      if (!studentObjectId) {
        throw new CourseEnrollmentError("INVALID_ID", "Alumno no válido.");
      }
      const course = await repository.findCourse(courseObjectId);
      assertCourseAccess(course, input.actor);

      if (course.status === "archived") {
        throw new CourseEnrollmentError(
          "COURSE_ARCHIVED",
          "No se pueden añadir alumnos a un curso archivado.",
        );
      }

      const student = await repository.findStudent(studentObjectId);
      if (!student) {
        throw new CourseEnrollmentError(
          "STUDENT_NOT_FOUND",
          "El alumno no existe.",
        );
      }
      if (student.isActive === false) {
        throw new CourseEnrollmentError(
          "STUDENT_INACTIVE",
          "No se puede matricular a un alumno inactivo.",
        );
      }
      if (
        input.actor.role !== "admin" &&
        String(student.teacherId ?? "") !== input.actor.id
      ) {
        throw new CourseEnrollmentError(
          "FORBIDDEN",
          "No tienes permiso para gestionar este alumno.",
        );
      }

      await repository.backfillLegacyEnrollments(course);
      const existing = await repository.findEnrollment(
        courseObjectId,
        studentObjectId,
      );
      if (existing) {
        throw new CourseEnrollmentError(
          "ALREADY_ENROLLED",
          "El alumno ya está matriculado en este curso.",
        );
      }

      const capacity = getCourseCapacity(course);
      if (
        capacity !== null &&
        (await repository.countActiveEnrollments(courseObjectId)) >= capacity
      ) {
        throw new CourseEnrollmentError(
          "COURSE_CAPACITY_REACHED",
          "El curso ya ha alcanzado su capacidad máxima.",
        );
      }

      const enrolledAt = new Date();
      let enrollment: EnrollmentRecord;
      try {
        enrollment = await repository.createEnrollment({
          courseId: courseObjectId,
          studentId: studentObjectId,
          status: "active",
          enrolledAt,
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new CourseEnrollmentError(
            "ALREADY_ENROLLED",
            "El alumno ya está matriculado en este curso.",
          );
        }
        throw new CourseEnrollmentError(
          "PERSISTENCE_ERROR",
          "No se pudo crear la matrícula.",
        );
      }

      try {
        await repository.syncLegacyCourseProjection({
          courseId: courseObjectId,
          studentId: studentObjectId,
          enrolledAt,
        });
      } catch {
        await repository.deleteEnrollment(String(enrollment._id));
        throw new CourseEnrollmentError(
          "PERSISTENCE_ERROR",
          "No se pudo completar la matrícula.",
        );
      }

      // This counter is a legacy denormalized read projection. Enrollment
      // creation must not be rolled back if only the counter refresh fails.
      try {
        const activeCount = await repository.countActiveEnrollments(courseObjectId);
        await repository.updateActiveEnrollmentCount(
          courseObjectId,
          activeCount,
        );
      } catch (error) {
        console.error("Could not refresh course enrollment count:", error);
      }

      return toCourseEnrollmentDTO(enrollment, student);
    },

    async listCourseEnrollments(input: {
      courseId: string;
      actor: EnrollmentActor;
    }): Promise<CourseEnrollmentListItemDTO[]> {
      assertActor(input.actor);
      const { courseObjectId } = parseEnrollmentIds(input.courseId);
      const course = await repository.findCourse(courseObjectId);
      assertCourseAccess(course, input.actor);
      await repository.backfillLegacyEnrollments(course);

      const enrollments = await repository.listEnrollments(courseObjectId);
      return enrollments.map((enrollment) =>
        toCourseEnrollmentDTO(enrollment),
      );
    },
  };
}

export const courseEnrollmentService = createCourseEnrollmentService();
