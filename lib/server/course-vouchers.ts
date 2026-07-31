import { QueryFilter, Types } from "mongoose";

import type {
  CourseVoucherPreviewDTO,
  CourseVoucherPreviewItemDTO,
  CourseVoucherWarning,
} from "@/lib/dto/course-voucher.dto";
import type { Role } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import type { CourseOperationalPolicies } from "@/lib/types/course-policies";
import { normalizeCourseMembers } from "@/lib/utils/course-members";
import { normalizeCourseOperationalPolicies } from "@/lib/utils/course-policies";
import {
  calculateCourseVoucherCredits,
  calculateIndividualBillingPeriod,
} from "@/lib/utils/course-voucher-billing";
import type { CourseVoucherRequestInput } from "@/lib/validators/course-voucher";
import {
  CourseProfile,
  type CourseProfileDocument,
  type ICourseProfile,
} from "@/models/CourseProfile";
import {
  StudentProfile,
  type PlanDoc,
  type StudentProfileDoc,
} from "@/models/StudentProfile";

type CurrentUser = {
  id: string;
  role: Role;
};

type StudentForCourseVoucher = Pick<
  StudentProfileDoc,
  "_id" | "fullName" | "activePlans"
>;

export interface CourseVoucherContext {
  course: CourseProfileDocument;
  policies: CourseOperationalPolicies;
  studentsById: Map<string, StudentForCourseVoucher>;
  preview: CourseVoucherPreviewDTO;
}

export class CourseVoucherRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: string[],
  ) {
    super(message);
    this.name = "CourseVoucherRequestError";
  }
}

function getCourseFilter(
  courseId: Types.ObjectId,
  user: CurrentUser,
): QueryFilter<ICourseProfile> {
  return user.role === "admin"
    ? { _id: courseId }
    : {
        _id: courseId,
        ownerTeacherId: new Types.ObjectId(user.id),
      };
}

function parseDateOnly(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function isSameUtcDay(first?: Date | null, second?: Date | null) {
  return (
    Boolean(first) &&
    Boolean(second) &&
    first?.getUTCFullYear() === second?.getUTCFullYear() &&
    first?.getUTCMonth() === second?.getUTCMonth() &&
    first?.getUTCDate() === second?.getUTCDate()
  );
}

function hasDuplicateVoucher(
  plans: PlanDoc[],
  courseId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return plans.some(
    (plan) =>
      plan.status !== "canceled" &&
      plan.courseId?.toString() === courseId &&
      isSameUtcDay(plan.billingPeriodStart, periodStart) &&
      isSameUtcDay(plan.billingPeriodEnd, periodEnd),
  );
}

function hasOwnValue(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export async function buildCourseVoucherContext({
  courseId,
  user,
  input,
}: {
  courseId: Types.ObjectId;
  user: CurrentUser;
  input: CourseVoucherRequestInput;
}): Promise<CourseVoucherContext> {
  const course = await CourseProfile.findOne(getCourseFilter(courseId, user));

  if (!course) {
    throw new CourseVoucherRequestError("Course not found", 404);
  }
  if (course.status === "archived") {
    throw new CourseVoucherRequestError(
      "No se pueden crear bonos para un curso archivado.",
      400,
    );
  }
  if (!course.classType) {
    throw new CourseVoucherRequestError(
      "El curso no tiene un tipo de clase configurado.",
      400,
    );
  }

  const members = normalizeCourseMembers({
    members: course.members,
    legacyStudentIds: course.studentIds,
    fallbackJoinedAt: course.startDate ?? course.createdAt,
  });
  const membersById = new Map(
    members.map((member) => [member.studentId, member]),
  );
  const missingMemberIds = input.memberStudentIds.filter(
    (studentId) => !membersById.has(studentId),
  );

  if (missingMemberIds.length > 0) {
    throw new CourseVoucherRequestError(
      "Uno o más alumnos no pertenecen al curso.",
      400,
      missingMemberIds,
    );
  }

  const studentFilter = getStudentOwnershipFilter(user, {
    _id: {
      $in: input.memberStudentIds.map(
        (studentId) => new Types.ObjectId(studentId),
      ),
    },
  });
  if (!studentFilter) {
    throw new CourseVoucherRequestError("Invalid user id", 500);
  }
  const students = await StudentProfile.find(studentFilter)
    .select("fullName activePlans")
    .lean<StudentForCourseVoucher[]>();
  const studentsById = new Map(
    students.map((student) => [student._id.toString(), student]),
  );
  const missingStudentIds = input.memberStudentIds.filter(
    (studentId) => !studentsById.has(studentId),
  );

  if (missingStudentIds.length > 0) {
    throw new CourseVoucherRequestError(
      "No se encontró el perfil de uno o más alumnos.",
      400,
      missingStudentIds,
    );
  }

  const policies = normalizeCourseOperationalPolicies(course.policies);
  const selectedStartDate = parseDateOnly(input.selectedStartDate);
  const courseIdString = courseId.toString();
  const courseName = course.name?.trim() || course.internalName;
  const items: CourseVoucherPreviewItemDTO[] = input.memberStudentIds.map(
    (studentId) => {
      const member = membersById.get(studentId);
      const student = studentsById.get(studentId);

      if (!member || !student) {
        throw new CourseVoucherRequestError(
          "No se pudo preparar la vista previa del alumno.",
          400,
        );
      }

      const period = calculateIndividualBillingPeriod({
        memberJoinedAt: new Date(member.joinedAt),
        billingStartedAt: member.billing.billingStartedAt
          ? new Date(member.billing.billingStartedAt)
          : null,
        existingBillingAnchorDay: member.billing.billingStartedAt
          ? member.billing.billingAnchorDay
          : null,
        nextBillingDate: member.billing.nextBillingDate
          ? new Date(member.billing.nextBillingDate)
          : null,
        selectedStartDate,
      });
      const hasManualCredits = hasOwnValue(
        input.manualCreditsByStudent,
        studentId,
      );
      const creditCalculation = calculateCourseVoucherCredits({
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        coursePolicies: policies,
        manualCredits: hasManualCredits
          ? input.manualCreditsByStudent[studentId]
          : null,
      });
      const hasPrice = hasOwnValue(input.priceByStudent, studentId);
      const priceTotal = input.priceByStudent[studentId] ?? 0;
      const paymentStatus =
        input.paymentStatusByStudent[studentId] ?? "pending";
      const amountPaid =
        input.amountPaidByStudent[studentId] ??
        (paymentStatus === "paid" ? priceTotal : 0);
      const warnings = new Set<CourseVoucherWarning>();

      if (member.status === "paused") warnings.add("member_paused");
      if (member.status === "left") warnings.add("member_left");
      if (!member.billing.firstVoucherId) warnings.add("first_voucher");
      else warnings.add("renewing_existing_cycle");
      if (!hasPrice) warnings.add("missing_price");
      if (
        policies.schedulingDefaults.preferredWeekdays.length === 0 &&
        !hasManualCredits
      ) {
        warnings.add("no_preferred_weekdays_manual_credits_required");
      }
      if (
        hasDuplicateVoucher(
          student.activePlans ?? [],
          courseIdString,
          period.periodStart,
          period.periodEnd,
        )
      ) {
        warnings.add("existing_voucher_for_period");
      }

      return {
        studentId,
        studentName: student.fullName,
        memberStatus: member.status,
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd.toISOString(),
        nextBillingDate: period.nextBillingDate.toISOString(),
        billingAnchorDay: period.billingAnchorDay,
        classOccurrencesCount: creditCalculation.classOccurrencesCount,
        creditsPerLesson: creditCalculation.creditsPerLesson,
        creditsTotal: creditCalculation.creditsTotal,
        priceTotal,
        unitCreditPrice:
          creditCalculation.creditsTotal > 0
            ? priceTotal / creditCalculation.creditsTotal
            : null,
        paymentStatus,
        amountPaid,
        paymentMethod:
          input.paymentMethodByStudent[studentId] ?? "",
        paymentNotes:
          input.paymentNotesByStudent[studentId] ?? "",
        internalNotes:
          input.internalNotesByStudent[studentId] ??
          input.notesByStudent[studentId] ??
          "",
        warnings: Array.from(warnings),
      };
    },
  );

  return {
    course,
    policies,
    studentsById,
    preview: {
      items,
      courseSummary: {
        courseId: courseIdString,
        courseName,
        classType: course.classType,
        frequency: policies.schedulingDefaults.frequency,
        sessionsPerWeek: policies.schedulingDefaults.sessionsPerWeek,
        preferredWeekdays: [
          ...policies.schedulingDefaults.preferredWeekdays,
        ],
        creditsPerLesson: policies.creditPolicy.creditsPerLesson,
      },
    },
  };
}
