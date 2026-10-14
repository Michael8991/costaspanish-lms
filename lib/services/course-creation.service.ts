import mongoose, { type ClientSession, Types } from "mongoose";

import { CourseEnrollment } from "@/models/CourseEnrollment";
import {
  CourseProfile,
  type ICourseMemberBilling,
} from "@/models/CourseProfile";
import type { ClassType } from "@/models/StudentProfile";

export type CourseCreationStudent = {
  _id: Types.ObjectId;
  isActive?: boolean;
};

export type InitialCourseMember = {
  studentId: Types.ObjectId;
  billing: ICourseMemberBilling;
};

export type CourseCreationEnrollment = {
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: "active";
  enrolledAt: Date;
  unenrolledAt: null;
};

export type CourseCreationProjectionMember = InitialCourseMember & {
  status: "active";
  joinedAt: Date;
  leftAt: null;
};

export interface CourseCreationTransaction {
  createCourse(course: Record<string, unknown>): Promise<void>;
  createEnrollments(enrollments: CourseCreationEnrollment[]): Promise<void>;
  projectMembership(args: {
    courseId: Types.ObjectId;
    studentIds: Types.ObjectId[];
    members: CourseCreationProjectionMember[];
  }): Promise<void>;
}

export interface CourseCreationRepository {
  withTransaction(
    work: (transaction: CourseCreationTransaction) => Promise<void>,
  ): Promise<void>;
}

export type CourseCreationErrorCode =
  | "DUPLICATE_STUDENT"
  | "INVALID_STUDENTS"
  | "INACTIVE_STUDENT"
  | "CLASS_CAPACITY_EXCEEDED"
  | "POLICY_CAPACITY_EXCEEDED";

export class CourseCreationError extends Error {
  constructor(
    readonly code: CourseCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CourseCreationError";
  }
}

function assertCourseCreationPreflight(args: {
  members: InitialCourseMember[];
  students: CourseCreationStudent[];
  classType: ClassType;
  maxStudents: number;
}) {
  const studentIds = args.members.map((member) => member.studentId.toString());
  if (new Set(studentIds).size !== studentIds.length) {
    throw new CourseCreationError(
      "DUPLICATE_STUDENT",
      "No se puede repetir un alumno.",
    );
  }

  const studentsById = new Map(
    args.students.map((student) => [student._id.toString(), student]),
  );
  if (
    studentsById.size !== studentIds.length ||
    studentIds.some((studentId) => !studentsById.has(studentId))
  ) {
    throw new CourseCreationError(
      "INVALID_STUDENTS",
      "Algunos alumnos no existen o no son accesibles.",
    );
  }

  if (studentIds.some((studentId) => studentsById.get(studentId)?.isActive === false)) {
    throw new CourseCreationError(
      "INACTIVE_STUDENT",
      "No se puede matricular a un alumno inactivo.",
    );
  }

  const classLimit = args.classType === "private"
    ? 1
    : args.classType === "pair"
      ? 2
      : Number.POSITIVE_INFINITY;
  if (studentIds.length > classLimit) {
    throw new CourseCreationError(
      "CLASS_CAPACITY_EXCEEDED",
      "La cantidad de alumnos supera el límite del tipo de clase.",
    );
  }

  if (studentIds.length > args.maxStudents) {
    throw new CourseCreationError(
      "POLICY_CAPACITY_EXCEEDED",
      "La cantidad de alumnos supera la capacidad de la política del curso.",
    );
  }
}

class MongooseCourseCreationTransaction implements CourseCreationTransaction {
  constructor(private readonly session: ClientSession) {}

  async createCourse(course: Record<string, unknown>) {
    await CourseProfile.create([course], { session: this.session });
  }

  async createEnrollments(enrollments: CourseCreationEnrollment[]) {
    await CourseEnrollment.insertMany(enrollments, {
      session: this.session,
      ordered: true,
    });
  }

  async projectMembership(args: {
    courseId: Types.ObjectId;
    studentIds: Types.ObjectId[];
    members: CourseCreationProjectionMember[];
  }) {
    const result = await CourseProfile.updateOne(
      { _id: args.courseId },
      {
        $set: {
          studentIds: args.studentIds,
          members: args.members,
          "stats.activeEnrollmentCount": args.studentIds.length,
        },
      },
      { session: this.session, runValidators: true },
    );

    if (result.matchedCount !== 1) {
      throw new Error("Created course was not found while projecting membership");
    }
  }
}

export const mongooseCourseCreationRepository: CourseCreationRepository = {
  async withTransaction(work) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await work(new MongooseCourseCreationTransaction(session));
      });
    } finally {
      await session.endSession();
    }
  },
};

export async function createCourseFromTemplateAtomic(args: {
  course: Record<string, unknown> & { _id: Types.ObjectId };
  members: InitialCourseMember[];
  students: CourseCreationStudent[];
  classType: ClassType;
  maxStudents: number;
  enrolledAt: Date;
  repository?: CourseCreationRepository;
}) {
  assertCourseCreationPreflight(args);

  const studentIds = args.members.map((member) => member.studentId);
  const projectedMembers: CourseCreationProjectionMember[] = args.members.map(
    (member) => ({
      studentId: member.studentId,
      status: "active",
      joinedAt: args.enrolledAt,
      leftAt: null,
      billing: member.billing,
    }),
  );
  const currentStats =
    typeof args.course.stats === "object" && args.course.stats !== null
      ? args.course.stats
      : {};
  const initialCourse = {
    ...args.course,
    studentIds: [],
    members: [],
    stats: {
      ...currentStats,
      activeEnrollmentCount: 0,
    },
  };

  await (args.repository ?? mongooseCourseCreationRepository).withTransaction(
    async (transaction) => {
      await transaction.createCourse(initialCourse);
      await transaction.createEnrollments(
        studentIds.map((studentId) => ({
          courseId: args.course._id,
          studentId,
          status: "active",
          enrolledAt: args.enrolledAt,
          unenrolledAt: null,
        })),
      );
      await transaction.projectMembership({
        courseId: args.course._id,
        studentIds,
        members: projectedMembers,
      });
    },
  );
}
