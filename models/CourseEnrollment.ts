import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export const COURSE_ENROLLMENT_STATUSES = ["active", "inactive"] as const;

export type CourseEnrollmentStatus =
  (typeof COURSE_ENROLLMENT_STATUSES)[number];

export interface ICourseEnrollment {
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: CourseEnrollmentStatus;
  enrolledAt: Date;
  unenrolledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseEnrollmentDocument =
  HydratedDocument<ICourseEnrollment>;

const CourseEnrollmentSchema = new Schema<ICourseEnrollment>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "CourseProfile",
      required: true,
      immutable: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      immutable: true,
      index: true,
    },
    status: {
      type: String,
      enum: COURSE_ENROLLMENT_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
    enrolledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    unenrolledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// One durable relationship per course/student pair. A future re-enrollment can
// reactivate this document without losing its identity or history fields.
CourseEnrollmentSchema.index(
  { courseId: 1, studentId: 1 },
  { unique: true, name: "unique_course_student_enrollment" },
);
CourseEnrollmentSchema.index({ courseId: 1, status: 1, enrolledAt: -1 });

export const CourseEnrollment =
  models.CourseEnrollment ||
  model<ICourseEnrollment>("CourseEnrollment", CourseEnrollmentSchema);

