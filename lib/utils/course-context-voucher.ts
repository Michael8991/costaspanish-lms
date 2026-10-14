export const COURSE_ENROLLMENT_MISMATCH = {
  code: "course_enrollment_mismatch",
  error: "La matrícula seleccionada no pertenece a este curso.",
  status: 409,
} as const;

export function withAuthoritativeCourseVoucherFields(
  body: Record<string, unknown>,
  courseClassType: string,
) {
  return {
    ...body,
    classType: courseClassType,
    createdFrom: "course_profile" as const,
    generatedFromCourse: false,
    generatedFromCourseMember: false,
  };
}

type StringableId = { toString(): string };

export function resolveCourseVoucherAssociation<
  TEnrollmentId extends StringableId,
  TCourseId extends StringableId,
>(args: {
  routeCourseId: string;
  enrollment: {
    _id: TEnrollmentId;
    courseId: TCourseId;
  };
}) {
  if (args.enrollment.courseId.toString() !== args.routeCourseId) {
    return {
      ok: false as const,
      ...COURSE_ENROLLMENT_MISMATCH,
    };
  }

  return {
    ok: true as const,
    association: {
      enrollmentId: args.enrollment._id,
      courseId: args.enrollment.courseId,
    },
  };
}
