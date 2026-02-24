import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongo";
import User from "@/models/User";

type GoogleStatusResponse =
  | {
      connected: false;
    }
  | {
      connected: true;
      email: string | null;
      calendarId: string;
      updatedAt: Date | null;
    };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teacherIdParam = searchParams.get("teacherId");

  let targetUserId = session.user.id;

  // Admin puede consultar estado de un teacher
  if (session.user.role === "admin") {
    if (!teacherIdParam) {
      return NextResponse.json({ error: "Missing teacherId" }, { status: 400 });
    }
    targetUserId = teacherIdParam;
  } else if (session.user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const user = await User.findById(targetUserId)
    .select("role google")
    .lean();

  if (!user || user.role !== "teacher") {
    return NextResponse.json({ connected: false } satisfies GoogleStatusResponse);
  }

  if (!user.google?.connected) {
    return NextResponse.json({ connected: false } satisfies GoogleStatusResponse);
  }

  const response: GoogleStatusResponse = {
    connected: true,
    email: user.google?.email ?? null,
    calendarId: user.google?.calendarId ?? "primary",
    updatedAt: user.google?.updatedAt ?? null,
  };

  return NextResponse.json(response);
}