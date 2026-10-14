import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import type { GeneratedCourseVoucherDTO } from "@/lib/dto/course-voucher.dto";
import { CourseEnrollment } from "@/models/CourseEnrollment";
import dbConnect from "@/lib/mongo";
import {
  buildCourseVoucherContext,
  CourseVoucherRequestError,
} from "@/lib/server/course-vouchers";
import {
  CourseVoucherGenerationError,
  persistCourseVouchersAfterEnrollmentPreflight,
  type CourseVoucherWrite,
} from "@/lib/services/course-voucher-generation.service";
import { toCourseProfileDetailDTO } from "@/lib/utils/course-profile.mapper";
import { generateCourseVouchersSchema } from "@/lib/validators/course-voucher";
import type { PlanDoc } from "@/models/StudentProfile";
import { toCents } from "@/lib/utils/money";
import {
  buildCourseMemberBillingBulkOperations,
  getCourseVoucherPlanDates,
} from "@/lib/utils/course-voucher-billing";
import { CourseProfile } from "@/models/CourseProfile";

export const runtime = "nodejs";

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
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
    const generation = await persistCourseVouchersAfterEnrollmentPreflight({
      courseId,
      studentIds: context.preview.items.map((item) => item.studentId),
      enrollments,
      prepare: (enrollmentByStudent) => {
        const generatedItems: GeneratedCourseVoucherDTO[] = [];
        const plansByStudentId = new Map<string, PlanDoc>();

        for (const item of context.preview.items) {
          const enrollment = enrollmentByStudent.get(item.studentId)!;
          const voucherId = new Types.ObjectId();
          const planDates = getCourseVoucherPlanDates(item);
          const periodStart = planDates.billingPeriodStart;
          const periodEnd = planDates.billingPeriodEnd;
          const paidAt = null;
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
            validFrom: planDates.validFrom,
            validUntil: planDates.validUntil,
            status: "active",
            price: item.priceTotal,
            priceTotalCents: toCents(item.priceTotal),
            amountPaidCents: 0,
            enrollmentId: enrollment._id,
            courseId: enrollment.courseId,
            courseNameSnapshot: courseName,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            billingMode: "individual_cycle",
            billingAnchorDay: item.billingAnchorDay,
            generatedFromCourse: true,
            generatedFromCourseMember: true,
            paymentStatus: "pending",
            amountPaid: 0,
            paidAt,
            paymentMethod: "",
            paymentNotes: "",
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
            paidAt: null,
          });
        }

        const voucherWrites: CourseVoucherWrite[] = [];
        for (const [studentId, plan] of plansByStudentId) {
          const duplicateGuard = parsed.data.allowDuplicatePeriod
            ? {}
            : {
                activePlans: {
                  $not: {
                    $elemMatch: {
                      courseId,
                      validFrom: { $lte: plan.validUntil },
                      validUntil: { $gte: plan.validFrom },
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
          voucherWrites.push({ studentFilter, plan });
        }

        const billingOperations = buildCourseMemberBillingBulkOperations({
          courseId,
          members: context.course.members,
          generatedItems,
        });

        return {
          voucherWrites,
          billingOperations,
          result: generatedItems,
        };
      },
    });
    if (!generation.ok) {
      return NextResponse.json(
        {
          error: "Todos los alumnos seleccionados deben tener una matrícula activa en el curso antes de generar bonos.",
          details: { missingStudentIds: generation.missingStudentIds },
        },
        { status: 409 },
      );
    }
    const generatedItems = generation.value;

    const updatedCourse = await CourseProfile.findById(courseId);
    if (!updatedCourse) {
      throw new Error("Course disappeared after voucher generation");
    }
    await updatedCourse.populate({
      path: "members.studentId",
      select: "fullName contactEmail level isActive activePlans",
      ...(user.role === "admin"
        ? {}
        : { match: { teacherId: new Types.ObjectId(user.id) } }),
    });
    await updatedCourse.populate({
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
        course: toCourseProfileDetailDTO(updatedCourse.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CourseVoucherGenerationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "VOUCHER_WRITE_CONFLICT" ? 409 : 500 },
      );
    }
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
