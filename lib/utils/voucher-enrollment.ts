import { Types } from "mongoose";

export type VoucherEnrollmentRecord = {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: string;
};

export function deriveVoucherAssociation(
  enrollment: VoucherEnrollmentRecord,
) {
  return {
    enrollmentId: enrollment._id,
    courseId: enrollment.courseId,
  };
}

export function preflightCourseVoucherEnrollments<T extends VoucherEnrollmentRecord>(
  args: {
    courseId: Types.ObjectId;
    studentIds: string[];
    enrollments: T[];
  },
) {
  const requestedStudentIds = new Set(args.studentIds);
  const enrollmentByStudent = new Map<string, T>();

  for (const enrollment of args.enrollments) {
    const studentId = enrollment.studentId.toString();
    if (
      requestedStudentIds.has(studentId) &&
      enrollment.status === "active" &&
      enrollment.courseId.equals(args.courseId)
    ) {
      enrollmentByStudent.set(studentId, enrollment);
    }
  }

  const missingStudentIds = args.studentIds.filter(
    (studentId) => !enrollmentByStudent.has(studentId),
  );

  return { enrollmentByStudent, missingStudentIds };
}
