import type { CourseEnrollmentStatus } from "@/models/CourseEnrollment";

export type CourseEnrollmentStudentSource = {
  _id: unknown;
  fullName?: string | null;
  contactEmail?: string | null;
};

export type CourseEnrollmentSource = {
  _id: unknown;
  courseId: unknown;
  studentId: unknown | CourseEnrollmentStudentSource;
  status: CourseEnrollmentStatus;
  enrolledAt: Date | string;
};

export interface CourseEnrollmentListItemDTO {
  id: string;
  enrollmentId: string;
  courseId: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  status: CourseEnrollmentStatus;
  enrolledAt: string;
}

function asStudent(value: unknown): CourseEnrollmentStudentSource | null {
  if (typeof value !== "object" || value === null || !("_id" in value)) {
    return null;
  }

  return value as CourseEnrollmentStudentSource;
}

export function toCourseEnrollmentDTO(
  source: CourseEnrollmentSource,
  studentOverride?: CourseEnrollmentStudentSource,
): CourseEnrollmentListItemDTO {
  const populatedStudent = asStudent(source.studentId);
  const student = studentOverride ?? populatedStudent;
  const enrollmentId = String(source._id);
  const studentId = String(student?._id ?? source.studentId);
  const enrolledAt =
    source.enrolledAt instanceof Date
      ? source.enrolledAt
      : new Date(source.enrolledAt);

  return {
    id: enrollmentId,
    enrollmentId,
    courseId: String(source.courseId),
    studentId,
    student: {
      id: studentId,
      name: student?.fullName?.trim() || "Alumno",
      email: student?.contactEmail?.trim() || "",
    },
    status: source.status,
    enrolledAt: enrolledAt.toISOString(),
  };
}

