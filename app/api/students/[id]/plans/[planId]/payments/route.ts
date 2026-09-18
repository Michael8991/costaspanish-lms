import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  voucherPaymentService,
  VoucherPaymentError,
} from "@/lib/services/voucher-payment.service";
import { registerVoucherPaymentSchema } from "@/lib/validators/voucher-payment";

type Ctx = {
  params:
    | { id: string; planId: string }
    | Promise<{ id: string; planId: string }>;
};

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, planId } = await params;
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(planId) ||
      !mongoose.isValidObjectId(user.id)
    ) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = registerVoucherPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payment payload",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const result = await voucherPaymentService.registerPayment({
      studentId: id,
      voucherId: planId,
      ...parsed.data,
      actor: { id: user.id, role: user.role as "teacher" | "admin" },
    });
    return NextResponse.json({ item: result }, { status: 201 });
  } catch (error) {
    if (error instanceof VoucherPaymentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Error registering voucher payment:", error);
    return NextResponse.json({ error: "No se pudo registrar el cobro." }, { status: 500 });
  }
}
