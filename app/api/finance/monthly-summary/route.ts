import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  buildFinanceOwnershipFilter,
  FinanceLedgerQueryError,
  getCurrentUtcMonth,
  parseFinanceMonth,
} from "@/lib/server/finance-ledger.query";
import { CreditLedgerEntry } from "@/models/CreditLedgerEntry";
import { PaymentLedgerEntry } from "@/models/PaymentLedgerEntry";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month =
      parseFinanceMonth(
        searchParams.get("month") ?? getCurrentUtcMonth(),
      );
    if (!month) {
      throw new FinanceLedgerQueryError("month is required");
    }
    const ownershipFilter = buildFinanceOwnershipFilter({
      user,
      searchParams,
    });

    await dbConnect();
    const [paymentRows, creditRows] = await Promise.all([
      PaymentLedgerEntry.aggregate<{
        collectedAmount: number;
        activePaymentEntries: number;
      }>([
        {
          $match: {
            ...ownershipFilter,
            status: "active",
            paidAt: { $gte: month.start, $lt: month.end },
          },
        },
        {
          $group: {
            _id: null,
            collectedAmount: { $sum: "$amount" },
            activePaymentEntries: { $sum: 1 },
          },
        },
      ]),
      CreditLedgerEntry.aggregate<{
        earnedEstimatedAmount: number;
        consumedCredits: number;
        activeCreditEntries: number;
      }>([
        {
          $match: {
            ...ownershipFilter,
            status: "active",
            consumedAt: { $gte: month.start, $lt: month.end },
          },
        },
        {
          $group: {
            _id: null,
            earnedEstimatedAmount: { $sum: "$estimatedRevenue" },
            consumedCredits: { $sum: "$creditsConsumed" },
            activeCreditEntries: { $sum: 1 },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      month: month.month,
      collectedAmount: paymentRows[0]?.collectedAmount ?? 0,
      earnedEstimatedAmount: creditRows[0]?.earnedEstimatedAmount ?? 0,
      consumedCredits: creditRows[0]?.consumedCredits ?? 0,
      activePaymentEntries: paymentRows[0]?.activePaymentEntries ?? 0,
      activeCreditEntries: creditRows[0]?.activeCreditEntries ?? 0,
    });
  } catch (error) {
    if (error instanceof FinanceLedgerQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET monthly finance summary error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el resumen financiero." },
      { status: 500 },
    );
  }
}
