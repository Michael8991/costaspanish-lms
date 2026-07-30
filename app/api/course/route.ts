import { NextRequest, NextResponse } from "next/server";
import { QueryFilter, Types } from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { toCourseProfileListItemDTO } from "@/lib/utils/course-profile.mapper";
import dbConnect from "@/lib/mongo";
import {
  CourseProfile,
  type CourseProfileStatus,
  type ICourseProfile,
} from "@/models/CourseProfile";
import "@/models/StudentProfile";

export const runtime = "nodejs";

const COURSE_PROFILE_STATUSES: CourseProfileStatus[] = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
];

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    if (!user || !requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 12), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search")?.trim();
    const requestedStatus = searchParams.get("status");

    const query: QueryFilter<ICourseProfile> =
      user.role === "admin"
        ? {}
        : { ownerTeacherId: new Types.ObjectId(user.id) };

    if (
      requestedStatus &&
      COURSE_PROFILE_STATUSES.includes(
        requestedStatus as CourseProfileStatus,
      )
    ) {
      query.status = requestedStatus as CourseProfileStatus;
    } else {
      query.status = { $ne: "archived" };
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { internalName: { $regex: safeSearch, $options: "i" } },
        { code: { $regex: safeSearch, $options: "i" } },
        { "templateSnapshot.internalName": { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      CourseProfile.find(query)
        .populate({
          path: "studentIds",
          select: "fullName contactEmail level isActive",
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseProfile.countDocuments(query),
    ]);

    return NextResponse.json({
      items: items.map(toCourseProfileListItemDTO),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/course error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
