import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  buildFinanceBaseFilter,
  FinanceLedgerQueryError,
  parseFinancePagination,
  parseFinanceStatus,
} from "@/lib/server/finance-ledger.query";
import { toCreditLedgerEntryDTO } from "@/lib/utils/credit-ledger.mapper";
import { CreditLedgerEntry } from "@/models/CreditLedgerEntry";

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
      dateField: "consumedAt",
    });
    const itemFilter =
      status === "all" ? baseFilter : { ...baseFilter, status };
    const summaryFilter = { ...baseFilter, status: "active" };

    await dbConnect();
    const [items, total, summaryRows] = await Promise.all([
      CreditLedgerEntry.find(itemFilter)
        .sort({ consumedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreditLedgerEntry.countDocuments(itemFilter),
      CreditLedgerEntry.aggregate<{
        totalCreditsConsumed: number;
        totalEstimatedRevenue: number;
      }>([
        { $match: summaryFilter },
        {
          $group: {
            _id: null,
            totalCreditsConsumed: { $sum: "$creditsConsumed" },
            totalEstimatedRevenue: { $sum: "$estimatedRevenue" },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      items: items.map(toCreditLedgerEntryDTO),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCreditsConsumed: summaryRows[0]?.totalCreditsConsumed ?? 0,
        totalEstimatedRevenue: summaryRows[0]?.totalEstimatedRevenue ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof FinanceLedgerQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET credit ledger error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el ledger de créditos." },
      { status: 500 },
    );
  }
}
