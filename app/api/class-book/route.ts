import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import {
  ClassBookQueryError,
  getCurrentClassBookMonth,
  getClassBookData,
} from "@/lib/server/class-book.query";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseOptionalInteger(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  return Number(value);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month") ?? getCurrentClassBookMonth();
    const data = await getClassBookData({
      user,
      month,
      courseId: searchParams.get("courseId") || undefined,
      studentId: searchParams.get("studentId") || undefined,
      status: searchParams.get("status") || undefined,
      page: parseOptionalInteger(searchParams.get("page")),
      limit: parseOptionalInteger(searchParams.get("limit")),
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof ClassBookQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/class-book error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el libro de clases." },
      { status: 500 },
    );
  }
}
