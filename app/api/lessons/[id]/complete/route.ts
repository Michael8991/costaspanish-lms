import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { getStudentOwnerMatch } from "@/lib/auth/studentOwnership";
import dbConnect from "@/lib/mongo";
import type { CourseOperationalPolicies } from "@/lib/types/course-policies";
import type {
  LessonAttendanceStatus,
  LessonCreditSettlement,
  LessonCreditSettlementItem,
  LessonPolicySnapshot,
} from "@/lib/types/lesson";
import {
  calculateCreditsForAttendee,
  resolveEffectiveLessonCreditPolicy,
} from "@/lib/utils/lesson-credit-policy";
import { buildLessonPolicySnapshotFromCoursePolicies } from "@/lib/utils/lesson-policy-snapshot";
import {
  isPlanCompatible,
  selectBestCompatiblePlan,
} from "@/lib/utils/lesson-voucher";
import { normalizeCourseOperationalPolicies } from "@/lib/utils/course-policies";
import { toLessonDetailDTO } from "@/lib/utils/lesson.mapper";
import { CourseProfile } from "@/models/CourseProfile";
import Lesson from "@/models/Lesson";
import {
  StudentProfile,
  type ClassType,
  type PlanStatus,
} from "@/models/StudentProfile";

type LessonAttendeeForComplete = {
  studentId: Types.ObjectId | string;
  voucherId?: Types.ObjectId | string | null;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
};

type LessonForComplete = {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  courseId?: Types.ObjectId | string | null;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  classType: ClassType;
  attendees?: LessonAttendeeForComplete[];
  policySnapshot?: LessonPolicySnapshot | null;
  creditSettlement?: LessonCreditSettlement | null;
};

type CourseForComplete = {
  _id: Types.ObjectId;
  policies?: Partial<CourseOperationalPolicies> | null;
  members?: Array<{
    studentId: Types.ObjectId | string;
    billing?: {
      lastVoucherId?: Types.ObjectId | string | null;
    } | null;
  }>;
  studentIds?: Array<Types.ObjectId | string>;
};

type StudentPlanForComplete = {
  _id: Types.ObjectId;
  classType?: string;
  status: PlanStatus;
  creditsRemaining?: number;
  creditsTotal?: number;
  validUntil?: Date | null;
};

type StudentForComplete = {
  _id: Types.ObjectId;
  fullName: string;
  activePlans?: StudentPlanForComplete[];
};

type ResolvedConsumption = {
  studentObjectId: Types.ObjectId;
  voucherObjectId: Types.ObjectId;
  creditsToConsume: number;
};

function toValidObjectId(value?: Types.ObjectId | string | null) {
  if (!value) return null;

  const stringValue = value.toString();
  return Types.ObjectId.isValid(stringValue)
    ? new Types.ObjectId(stringValue)
    : null;
}

function getIdString(value?: Types.ObjectId | string | null) {
  return value?.toString() ?? "";
}

function getPlanCredits(plan: StudentPlanForComplete) {
  return typeof plan.creditsRemaining === "number" &&
    Number.isFinite(plan.creditsRemaining)
    ? plan.creditsRemaining
    : 0;
}

function isActivePlanWithAvailableCredits(
  plan: StudentPlanForComplete | undefined,
  requiredCredits: number,
  reservedCredits: number,
) {
  return (
    plan?.status === "active" &&
    getPlanCredits(plan) - reservedCredits >= requiredCredits
  );
}

function getCourseMemberVoucherIds(course: CourseForComplete | null) {
  const voucherIds = new Map<string, string>();

  for (const member of course?.members ?? []) {
    const studentId = getIdString(member.studentId);
    const voucherId = getIdString(member.billing?.lastVoucherId);

    if (studentId && voucherId) {
      voucherIds.set(studentId, voucherId);
    }
  }

  return voucherIds;
}

async function getResponseLesson(filter: Record<string, unknown>) {
  const lesson = await Lesson.findOne(filter).populate({
    path: "courseId",
    select: "name internalName",
  });

  return lesson ? toLessonDetailDTO(lesson.toObject()) : null;
}

function idempotentResponse(
  item: ReturnType<typeof toLessonDetailDTO>,
) {
  return NextResponse.json(
    {
      ok: true,
      creditsConsumed: item.creditSettlement?.totalCreditsConsumed ?? 0,
      item,
      warnings: ["lesson_already_settled"],
    },
    { status: 200 },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    await dbConnect();

    const lessonObjectId = new Types.ObjectId(id);
    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }
    const studentOwnerMatch = getStudentOwnerMatch(user);
    if (!studentOwnerMatch) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }

    const filter: Record<string, unknown> =
      user.role === "admin"
        ? { _id: lessonObjectId }
        : {
            _id: lessonObjectId,
            teacherId: currentUserObjectId,
          };

    const lesson = await Lesson.findOne(filter).lean<LessonForComplete>();

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    if (
      lesson.status === "completed" ||
      lesson.creditSettlement?.status === "settled" ||
      lesson.creditSettlement?.status === "skipped"
    ) {
      const currentLesson = await getResponseLesson(filter);

      if (!currentLesson) {
        return NextResponse.json(
          { ok: false, error: "Lesson not found" },
          { status: 404 },
        );
      }

      return idempotentResponse(currentLesson);
    }

    if (lesson.creditSettlement?.status === "pending") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La liquidación de créditos de esta clase ya está en proceso.",
        },
        { status: 409 },
      );
    }

    if (
      lesson.status === "voided" ||
      lesson.status === "canceled_by_teacher"
    ) {
      return NextResponse.json(
        { ok: false, error: "This lesson cannot be completed" },
        { status: 409 },
      );
    }

    const attendees = lesson.attendees ?? [];

    if (attendees.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Lesson has no attendees" },
        { status: 400 },
      );
    }

    if (
      attendees.some(
        (attendee) => attendee.attendanceStatus === "pending",
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "All attendees must have attendance marked before completing the lesson",
        },
        { status: 400 },
      );
    }

    const hasCourseReference =
      lesson.courseId !== undefined && lesson.courseId !== null;
    const courseObjectId = toValidObjectId(lesson.courseId);
    let course: CourseForComplete | null = null;

    if (courseObjectId) {
      const courseFilter: Record<string, unknown> =
        user.role === "admin"
          ? { _id: courseObjectId }
          : {
              _id: courseObjectId,
              ownerTeacherId: currentUserObjectId,
            };

      course = await CourseProfile.findOne(courseFilter)
        .select("policies members studentIds")
        .lean<CourseForComplete>();
    }

    if (hasCourseReference && !lesson.policySnapshot && !course) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede completar la clase: no existe el curso ni una copia de sus reglas.",
        },
        { status: 400 },
      );
    }

    const warnings: string[] = [];
    let policySnapshot = lesson.policySnapshot ?? null;

    if (courseObjectId && !policySnapshot && course) {
      if (!course.policies) {
        warnings.push("course_policies_missing_using_defaults");
      }

      const policies = normalizeCourseOperationalPolicies(course.policies);
      const scheduledDurationMinutes = Math.max(
        1,
        Math.round(
          (new Date(lesson.scheduledEnd).getTime() -
            new Date(lesson.scheduledStart).getTime()) /
            60_000,
        ),
      );

      policySnapshot = buildLessonPolicySnapshotFromCoursePolicies({
        policies,
        durationMinutes: scheduledDurationMinutes,
        timezone: lesson.timezone,
        classType: lesson.classType,
      });
      warnings.push("using_course_policy_fallback");
    }

    const effectivePolicy = resolveEffectiveLessonCreditPolicy({
      lesson: {
        courseId: lesson.courseId,
        policySnapshot: lesson.policySnapshot,
      },
      courseProfile: course,
    });
    const calculatedItems = attendees.map((attendee) => ({
      attendee,
      studentObjectId: toValidObjectId(attendee.studentId),
      calculation: calculateCreditsForAttendee({
        attendee,
        policy: effectivePolicy.policy,
        legacyCreditsToConsume: attendee.creditsToConsume,
      }),
    }));

    if (calculatedItems.some((item) => !item.studentObjectId)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede completar la clase: hay un asistente sin alumno válido.",
        },
        { status: 400 },
      );
    }

    if (
      calculatedItems.some(
        ({ calculation }) => calculation.reason === "trial_free",
      )
    ) {
      warnings.push("trial_did_not_consume_credit");
    }

    if (
      calculatedItems.some(
        ({ calculation }) => calculation.reason === "no_show_free",
      )
    ) {
      warnings.push("no_show_did_not_consume_credit");
    }

    const now = new Date();

    if (
      effectivePolicy.policy.mode === "course" &&
      effectivePolicy.policy.consumeOn === "scheduled"
    ) {
      warnings.push("scheduled_policy_not_processed_on_completion");

      const settlementItems: LessonCreditSettlementItem[] =
        calculatedItems.map(({ attendee, studentObjectId, calculation }) => ({
          studentId: studentObjectId as Types.ObjectId,
          voucherId: toValidObjectId(attendee.voucherId),
          attendanceStatus: attendee.attendanceStatus,
          isTrial: attendee.isTrial ?? false,
          creditsPlanned: calculation.creditsPlanned,
          creditsConsumed: 0,
          reason: "scheduled_policy_not_processed_on_completion",
          previousCreditsRemaining: null,
          newCreditsRemaining: null,
        }));
      const settlement: LessonCreditSettlement = {
        status: "skipped",
        source: effectivePolicy.source,
        policySource: effectivePolicy.policySource,
        consumeOn: "scheduled",
        settledAt: now,
        settledBy: currentUserObjectId,
        totalCreditsConsumed: 0,
        items: settlementItems,
        warnings: Array.from(new Set(warnings)),
      };
      const completedLesson = await Lesson.findOneAndUpdate(
        {
          ...filter,
          status: {
            $nin: ["completed", "voided", "canceled_by_teacher"],
          },
          "creditSettlement.status": {
            $nin: ["pending", "settled", "skipped"],
          },
        },
        {
          $set: {
            status: "completed",
            creditSettlement: settlement,
            ...(policySnapshot
              ? { policySnapshot }
              : {}),
            updatedAt: now,
          },
        },
        { new: true },
      ).populate({
        path: "courseId",
        select: "name internalName",
      });

      if (!completedLesson) {
        const currentLesson = await getResponseLesson(filter);
        if (
          currentLesson &&
          (currentLesson.status === "completed" ||
            currentLesson.creditSettlement?.status === "settled" ||
            currentLesson.creditSettlement?.status === "skipped")
        ) {
          return idempotentResponse(currentLesson);
        }

        return NextResponse.json(
          {
            ok: false,
            error:
              "La clase cambió mientras se completaba. Vuelve a intentarlo.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          creditsConsumed: 0,
          item: toLessonDetailDTO(completedLesson.toObject()),
          warnings: settlement.warnings,
        },
        { status: 200 },
      );
    }

    const studentObjectIds = calculatedItems.map(
      ({ studentObjectId }) => studentObjectId as Types.ObjectId,
    );
    const students = await StudentProfile.find({
      ...studentOwnerMatch,
      _id: { $in: studentObjectIds },
    })
      .select("fullName activePlans")
      .lean<StudentForComplete[]>();
    const studentsById = new Map(
      students.map((student) => [student._id.toString(), student]),
    );
    const memberVoucherIds = getCourseMemberVoucherIds(course);
    const reservedByVoucher = new Map<string, number>();
    const resolvedConsumptions: ResolvedConsumption[] = [];
    const settlementItems: LessonCreditSettlementItem[] = [];
    const creditErrors: string[] = [];

    for (const {
      attendee,
      studentObjectId,
      calculation,
    } of calculatedItems) {
      const validStudentObjectId = studentObjectId as Types.ObjectId;
      const studentId = validStudentObjectId.toString();
      const student = studentsById.get(studentId);
      const studentName = student?.fullName?.trim() || "el alumno";

      if (calculation.creditsConsumed <= 0) {
        settlementItems.push({
          studentId: validStudentObjectId,
          voucherId: toValidObjectId(attendee.voucherId),
          attendanceStatus: attendee.attendanceStatus,
          isTrial: attendee.isTrial ?? false,
          creditsPlanned: calculation.creditsPlanned,
          creditsConsumed: 0,
          reason: calculation.reason,
          previousCreditsRemaining: null,
          newCreditsRemaining: null,
        });
        continue;
      }

      if (!student) {
        creditErrors.push(
          `No se puede completar la clase: no se encontró el perfil de ${studentName}.`,
        );
        continue;
      }

      const activePlans = student.activePlans ?? [];
      const requestedVoucherId = getIdString(attendee.voucherId);
      const memberVoucherId = memberVoucherIds.get(studentId) ?? "";
      const getReservedCredits = (plan: StudentPlanForComplete) =>
        reservedByVoucher.get(`${studentId}:${plan._id.toString()}`) ?? 0;
      const requestedPlan = activePlans.find(
        (plan) => plan._id.toString() === requestedVoucherId,
      );
      const memberPlan = activePlans.find(
        (plan) => plan._id.toString() === memberVoucherId,
      );
      let selectedPlan = isActivePlanWithAvailableCredits(
        requestedPlan,
        calculation.creditsConsumed,
        requestedPlan ? getReservedCredits(requestedPlan) : 0,
      )
        ? requestedPlan
        : undefined;

      if (
        !selectedPlan &&
        isActivePlanWithAvailableCredits(
          memberPlan,
          calculation.creditsConsumed,
          memberPlan ? getReservedCredits(memberPlan) : 0,
        )
      ) {
        selectedPlan = memberPlan;
      }

      if (!selectedPlan) {
        const compatibleCandidates = activePlans
          .map((plan) => ({
            plan,
            _id: plan._id.toString(),
            classType: plan.classType,
            status: plan.status,
            creditsRemaining: plan.creditsRemaining,
            creditsTotal: plan.creditsTotal,
            validUntil: plan.validUntil,
          }))
          .filter(
            (candidate) =>
              isPlanCompatible(candidate, lesson.classType, now) &&
              getPlanCredits(candidate.plan) -
                getReservedCredits(candidate.plan) >=
                calculation.creditsConsumed,
          );

        selectedPlan =
          selectBestCompatiblePlan(compatibleCandidates)?.plan;
      }

      if (!selectedPlan) {
        creditErrors.push(
          `No se puede completar la clase: ${studentName} necesita ${calculation.creditsConsumed} crédito${calculation.creditsConsumed === 1 ? "" : "s"}, pero no tiene un bono activo suficiente.`,
        );
        continue;
      }

      const reservationKey = `${studentId}:${selectedPlan._id.toString()}`;
      const alreadyReserved = reservedByVoucher.get(reservationKey) ?? 0;
      const previousCreditsRemaining =
        getPlanCredits(selectedPlan) - alreadyReserved;
      const newCreditsRemaining =
        previousCreditsRemaining - calculation.creditsConsumed;

      reservedByVoucher.set(
        reservationKey,
        alreadyReserved + calculation.creditsConsumed,
      );
      resolvedConsumptions.push({
        studentObjectId: validStudentObjectId,
        voucherObjectId: selectedPlan._id,
        creditsToConsume: calculation.creditsConsumed,
      });
      settlementItems.push({
        studentId: validStudentObjectId,
        voucherId: selectedPlan._id,
        attendanceStatus: attendee.attendanceStatus,
        isTrial: attendee.isTrial ?? false,
        creditsPlanned: calculation.creditsPlanned,
        creditsConsumed: calculation.creditsConsumed,
        reason: calculation.reason,
        previousCreditsRemaining,
        newCreditsRemaining,
      });
    }

    if (creditErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: creditErrors.join(" "),
          details: creditErrors,
        },
        { status: 400 },
      );
    }

    const totalCreditsConsumed = settlementItems.reduce(
      (total, item) => total + item.creditsConsumed,
      0,
    );
    const pendingSettlement: LessonCreditSettlement = {
      status: "pending",
      source: effectivePolicy.source,
      policySource: effectivePolicy.policySource,
      consumeOn:
        effectivePolicy.policy.mode === "legacy"
          ? "legacy"
          : "completion",
      settledAt: null,
      settledBy: currentUserObjectId,
      totalCreditsConsumed,
      items: settlementItems,
      warnings: Array.from(new Set(warnings)),
    };
    const lockedLesson = await Lesson.findOneAndUpdate(
      {
        ...filter,
        status: {
          $nin: ["completed", "voided", "canceled_by_teacher"],
        },
        "creditSettlement.status": {
          $nin: ["pending", "settled", "skipped"],
        },
      },
      {
        $set: {
          creditSettlement: pendingSettlement,
          ...(policySnapshot ? { policySnapshot } : {}),
          updatedAt: now,
        },
      },
      { new: true },
    );

    if (!lockedLesson) {
      const currentLesson = await getResponseLesson(filter);
      if (
        currentLesson &&
        (currentLesson.status === "completed" ||
          currentLesson.creditSettlement?.status === "settled" ||
          currentLesson.creditSettlement?.status === "skipped")
      ) {
        return idempotentResponse(currentLesson);
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "La liquidación de créditos de esta clase ya está en proceso.",
        },
        { status: 409 },
      );
    }

    const appliedConsumptions: ResolvedConsumption[] = [];
    let completionCommitted = false;

    try {
      for (const consumption of resolvedConsumptions) {
        const updateResult = await StudentProfile.updateOne(
          {
            ...studentOwnerMatch,
            _id: consumption.studentObjectId,
            activePlans: {
              $elemMatch: {
                _id: consumption.voucherObjectId,
                status: "active",
                creditsRemaining: {
                  $gte: consumption.creditsToConsume,
                },
              },
            },
          },
          {
            $inc: {
              "activePlans.$.creditsRemaining":
                -consumption.creditsToConsume,
            },
          },
        );

        if (updateResult.modifiedCount !== 1) {
          throw new Error(
            "Los créditos de un alumno cambiaron durante la liquidación.",
          );
        }

        appliedConsumptions.push(consumption);
      }

      const completedLesson = await Lesson.findOneAndUpdate(
        {
          ...filter,
          "creditSettlement.status": "pending",
        },
        {
          $set: {
            status: "completed",
            "creditSettlement.status": "settled",
            "creditSettlement.settledAt": new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true },
      ).populate({
        path: "courseId",
        select: "name internalName",
      });

      if (!completedLesson) {
        throw new Error(
          "La clase cambió antes de confirmar la liquidación.",
        );
      }
      completionCommitted = true;
    } catch (settlementError) {
      await Promise.allSettled(
        appliedConsumptions.map((consumption) =>
          StudentProfile.updateOne(
            {
              ...studentOwnerMatch,
              _id: consumption.studentObjectId,
              "activePlans._id": consumption.voucherObjectId,
            },
            {
              $inc: {
                "activePlans.$.creditsRemaining":
                  consumption.creditsToConsume,
              },
              $set: {
                "activePlans.$.status": "active",
              },
            },
          ),
        ),
      );

      await Lesson.updateOne(
        {
          ...filter,
          "creditSettlement.status": "pending",
        },
        {
          $set: {
            "creditSettlement.status": "failed",
            "creditSettlement.settledAt": null,
            updatedAt: new Date(),
          },
          $push: {
            "creditSettlement.warnings":
              "credit_settlement_failed_and_was_rolled_back",
          },
        },
      );

      const message =
        settlementError instanceof Error
          ? settlementError.message
          : "No se pudo liquidar la clase.";

      return NextResponse.json(
        {
          ok: false,
          error: `${message} No se ha completado la clase ni se han conservado cargos parciales.`,
        },
        { status: 409 },
      );
    }

    if (!completionCommitted) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo confirmar la liquidación de créditos.",
        },
        { status: 409 },
      );
    }

    await Promise.allSettled(
      resolvedConsumptions.map((consumption) =>
        StudentProfile.updateOne(
          {
            ...studentOwnerMatch,
            _id: consumption.studentObjectId,
            activePlans: {
              $elemMatch: {
                _id: consumption.voucherObjectId,
                creditsRemaining: { $lte: 0 },
              },
            },
          },
          {
            $set: {
              "activePlans.$.status": "exhausted",
            },
          },
        ),
      ),
    );

    const responseLesson = await getResponseLesson(filter);
    if (!responseLesson) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La clase se completó, pero no se pudo recargar su detalle.",
        },
        { status: 500 },
      );
    }

    // TODO: Create CreditLedgerEntry after settlement.
    // TODO: Create PaymentLedgerEntry when a voucher is paid.
    // TODO: Support consumeOn="scheduled" during Lesson scheduling.
    // TODO: Advance CourseProfile progress after completion.
    return NextResponse.json(
      {
        ok: true,
        creditsConsumed: totalCreditsConsumed,
        item: responseLesson,
        warnings: pendingSettlement.warnings,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en POST /api/lessons/[id]/complete:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        error: "Internal Server Error",
        message,
      },
      { status: 500 },
    );
  }
}
