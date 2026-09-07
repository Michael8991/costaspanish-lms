import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import type { GeneratedCourseVoucherDTO } from "@/lib/dto/course-voucher.dto";
import { CourseEnrollment } from "@/models/CourseEnrollment";
import dbConnect from "@/lib/mongo";
import {
  ensurePaymentLedgerForVoucher,
  reverseActivePaymentLedgersForVouchers,
} from "@/lib/services/payment-ledger.service";
import {
  buildCourseVoucherContext,
  CourseVoucherRequestError,
} from "@/lib/server/course-vouchers";
import { normalizeCourseMembers } from "@/lib/utils/course-members";
import { toCourseProfileDetailDTO } from "@/lib/utils/course-profile.mapper";
import { generateCourseVouchersSchema } from "@/lib/validators/course-voucher";
import { StudentProfile, type PlanDoc } from "@/models/StudentProfile";

export const runtime = "nodejs";

type AppliedVoucher = {
  studentId: Types.ObjectId;
  voucherId: Types.ObjectId;
};

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function parseDateOnly(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function rollbackVouchers(args: {
  appliedVouchers: AppliedVoucher[];
  teacherId: Types.ObjectId;
  changedBy: Types.ObjectId;
}) {
  await Promise.allSettled(
    args.appliedVouchers.map(({ studentId, voucherId }) =>
      StudentProfile.updateOne(
        { _id: studentId },
        { $pull: { activePlans: { _id: voucherId } } },
      ),
    ),
  );

  await reverseActivePaymentLedgersForVouchers({
    teacherId: args.teacherId,
    voucherIds: args.appliedVouchers.map(({ voucherId }) => voucherId),
    changedBy: args.changedBy,
    reason: "voucher_generation_rolled_back",
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = generateCourseVouchersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const changedBy = getCurrentUserObjectId(user);
    if (!changedBy) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const courseId = new Types.ObjectId(id);
    const context = await buildCourseVoucherContext({
      courseId,
      user,
      input: parsed.data,
    });
    const validationErrors = context.preview.items.flatMap((item) => {
      if (item.memberStatus !== "active") {
        return [`${item.studentName} no es un integrante activo del curso.`];
      }
      if (item.creditsTotal <= 0) {
        return [
          `${item.studentName} necesita una cantidad de créditos mayor que 0.`,
        ];
      }
      if (
        item.warnings.includes("existing_voucher_for_period") &&
        !parsed.data.allowDuplicatePeriod
      ) {
        return [
          `${item.studentName} ya tiene un bono generado para este periodo.`,
        ];
      }
      if (
        item.paymentStatus === "partial" &&
        item.priceTotal > 0 &&
        item.amountPaid > item.priceTotal
      ) {
        return [
          `El importe pagado de ${item.studentName} no puede superar el precio total.`,
        ];
      }
      return [];
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: validationErrors.join(" "),
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    const courseName = context.preview.courseSummary.courseName;
    const enrollments = await CourseEnrollment.find({
      courseId,
      studentId: { $in: context.preview.items.map((item) => new Types.ObjectId(item.studentId)) },
      status: "active",
    }).lean();
    const enrollmentByStudent = new Map(
      enrollments.map((enrollment) => [enrollment.studentId.toString(), enrollment._id]),
    );
    const generatedItems: GeneratedCourseVoucherDTO[] = [];
    const plansByStudentId = new Map<string, PlanDoc>();

    for (const item of context.preview.items) {
      const voucherId = new Types.ObjectId();
      const periodStart = new Date(item.periodStart);
      const periodEnd = new Date(item.periodEnd);
      const requestedPaidAt = parseDateOnly(
        parsed.data.paidAtByStudent[item.studentId],
      );
      const paidAt =
        requestedPaidAt ??
        (item.paymentStatus === "paid" ? new Date() : null);
      const plan: PlanDoc = {
        _id: voucherId,
        name: `${courseName} · ${periodStart.toLocaleDateString("es-ES", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}`,
        billingType: "subscription",
        classType: context.preview.courseSummary.classType,
        creditsTotal: item.creditsTotal,
        creditsRemaining: item.creditsTotal,
        validFrom: periodStart,
        validUntil: periodEnd,
        status: "active",
        price: item.priceTotal,
        enrollmentId: enrollmentByStudent.get(item.studentId),
        courseId,
        courseNameSnapshot: courseName,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        billingMode: "individual_cycle",
        billingAnchorDay: item.billingAnchorDay,
        generatedFromCourse: true,
        generatedFromCourseMember: true,
        paymentStatus: item.paymentStatus,
        amountPaid: item.amountPaid,
        paidAt,
        paymentMethod: item.paymentMethod,
        paymentNotes: item.paymentNotes,
        internalNotes: item.internalNotes,
        priceTotal: item.priceTotal,
        currency: "EUR",
        unitCreditPriceSnapshot:
          item.creditsTotal > 0
            ? item.priceTotal / item.creditsTotal
            : null,
        createdFrom: "course_profile",
        notes: item.internalNotes,
      };

      plansByStudentId.set(item.studentId, plan);
      generatedItems.push({
        ...item,
        voucherId: voucherId.toString(),
        status: "active",
        paidAt: paidAt?.toISOString() ?? null,
      });
    }

    const appliedVouchers: AppliedVoucher[] = [];

    try {
      for (const [studentId, plan] of plansByStudentId) {
        const duplicateGuard = parsed.data.allowDuplicatePeriod
          ? {}
          : {
              activePlans: {
                $not: {
                  $elemMatch: {
                    courseId,
                    billingPeriodStart: plan.billingPeriodStart,
                    billingPeriodEnd: plan.billingPeriodEnd,
                    status: { $ne: "canceled" },
                  },
                },
              },
            };
        const studentFilter = getStudentOwnershipFilter(user, {
            _id: new Types.ObjectId(studentId),
            ...duplicateGuard,
        });
        if (!studentFilter) {
          throw new CourseVoucherRequestError("Invalid user id", 500);
        }
        const result = await StudentProfile.updateOne(
          studentFilter,
          { $push: { activePlans: plan } },
          { runValidators: true },
        );

        if (result.modifiedCount !== 1) {
          throw new CourseVoucherRequestError(
            "Otro proceso creó uno de los bonos para el mismo periodo.",
            409,
          );
        }

        appliedVouchers.push({
          studentId: new Types.ObjectId(studentId),
          voucherId: plan._id,
        });

        const generatedItem = generatedItems.find(
          (item) => item.studentId === studentId,
        );
        await ensurePaymentLedgerForVoucher({
          teacherId: context.course.ownerTeacherId,
          student: {
            _id: studentId,
            fullName: generatedItem?.studentName,
          },
          voucher: plan,
          changedBy,
          source: "voucher_created_paid",
        });
      }

      const normalizedMembers = normalizeCourseMembers({
        members: context.course.members,
        legacyStudentIds: context.course.studentIds,
        fallbackJoinedAt:
          context.course.startDate ?? context.course.createdAt,
      });
      const generatedByStudentId = new Map(
        generatedItems.map((item) => [item.studentId, item]),
      );
      const storedMembersByStudentId = new Map(
        context.course.members.map((member) => [
          member.studentId.toString(),
          member,
        ]),
      );

      context.course.members = normalizedMembers.map((member) => {
        const generated = generatedByStudentId.get(member.studentId);
        const storedMember = storedMembersByStudentId.get(member.studentId);
        const currentFirstVoucherId = member.billing.firstVoucherId;

        return {
          studentId: new Types.ObjectId(member.studentId),
          status: member.status,
          joinedAt: new Date(member.joinedAt),
          leftAt: member.leftAt ? new Date(member.leftAt) : null,
          billing: {
            mode: "individual_cycle" as const,
            billingAnchorDay:
              storedMember?.billing.billingAnchorDay ??
              generated?.billingAnchorDay,
            billingStartedAt: member.billing.billingStartedAt
              ? new Date(member.billing.billingStartedAt)
              : generated
                ? new Date(generated.periodStart)
                : null,
            nextBillingDate: generated
              ? new Date(generated.nextBillingDate)
              : member.billing.nextBillingDate
                ? new Date(member.billing.nextBillingDate)
                : null,
            firstVoucherId: currentFirstVoucherId
              ? new Types.ObjectId(currentFirstVoucherId)
              : generated
                ? new Types.ObjectId(generated.voucherId)
                : null,
            lastVoucherId: generated
              ? new Types.ObjectId(generated.voucherId)
              : member.billing.lastVoucherId
                ? new Types.ObjectId(member.billing.lastVoucherId)
                : null,
            notes: member.billing.notes,
          },
        };
      });
      context.course.markModified("members");
      await context.course.save();
    } catch (generationError) {
      await rollbackVouchers({
        appliedVouchers,
        teacherId: context.course.ownerTeacherId,
        changedBy,
      });
      throw generationError;
    }

    await context.course.populate({
      path: "members.studentId",
      select: "fullName contactEmail level isActive activePlans",
      ...(user.role === "admin"
        ? {}
        : { match: { teacherId: new Types.ObjectId(user.id) } }),
    });
    await context.course.populate({
      path: "studentIds",
      select: "fullName contactEmail level isActive",
      ...(user.role === "admin"
        ? {}
        : { match: { teacherId: new Types.ObjectId(user.id) } }),
    });

    revalidatePath("/", "layout");
    return NextResponse.json(
      {
        items: generatedItems,
        course: toCourseProfileDetailDTO(context.course.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CourseVoucherRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status },
      );
    }

    console.error("POST course voucher generate error:", error);
    return NextResponse.json(
      { error: "No se pudieron generar los bonos del curso." },
      { status: 500 },
    );
  }
}
