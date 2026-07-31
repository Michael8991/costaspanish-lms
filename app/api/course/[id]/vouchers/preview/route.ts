import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  buildCourseVoucherContext,
  CourseVoucherRequestError,
} from "@/lib/server/course-vouchers";
import { previewCourseVouchersSchema } from "@/lib/validators/course-voucher";

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
    const parsed = previewCourseVouchersSchema.safeParse(body);

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
    const context = await buildCourseVoucherContext({
      courseId: new Types.ObjectId(id),
      user,
      input: parsed.data,
    });

    return NextResponse.json(context.preview, { status: 200 });
  } catch (error) {
    if (error instanceof CourseVoucherRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status },
      );
    }

    console.error("POST course voucher preview error:", error);
    return NextResponse.json(
      { error: "No se pudo calcular la vista previa de los bonos." },
      { status: 500 },
    );
  }
}
