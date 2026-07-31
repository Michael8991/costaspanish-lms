import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  buildFinanceBaseFilter,
  FinanceLedgerQueryError,
  parseFinancePagination,
  parseFinanceStatus,
} from "@/lib/server/finance-ledger.query";
import { toPaymentLedgerEntryDTO } from "@/lib/utils/payment-ledger.mapper";
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
    const { page, limit, skip } = parseFinancePagination(searchParams);
    const status = parseFinanceStatus(searchParams);
    const baseFilter = buildFinanceBaseFilter({
      user,
      searchParams,
      dateField: "paidAt",
    });
    const itemFilter =
      status === "all" ? baseFilter : { ...baseFilter, status };
    const summaryFilter = { ...baseFilter, status: "active" };

    await dbConnect();
    const [items, total, summaryRows] = await Promise.all([
      PaymentLedgerEntry.find(itemFilter)
        .sort({ paidAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentLedgerEntry.countDocuments(itemFilter),
      PaymentLedgerEntry.aggregate<{ totalAmount: number }>([
        { $match: summaryFilter },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]),
    ]);

    return NextResponse.json({
      items: items.map(toPaymentLedgerEntryDTO),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: summaryRows[0]?.totalAmount ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof FinanceLedgerQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET payment ledger error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el ledger de pagos." },
      { status: 500 },
    );
  }
}
