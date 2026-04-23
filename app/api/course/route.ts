import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/lib/mongo";
import { requireAuth } from "@/lib/auth/apiAuth";
import { CourseProfile, type ICourseProfile } from "@/models/CourseProfile";
import {
  COURSE_STATUSES,
  COURSE_TYPES,
  COURSE_VISIBILITIES,
} from "@/lib/constants/course.constants";
import { QueryFilter, Types } from "mongoose";
import { createCourseProfileSchema } from "@/lib/validators/course.validator";

export const runtime = "nodejs";

type AuthUser = {
  id?: string;
  _id?: string;
  role?: string;
};

function getCurrentUserId(user: AuthUser) {
  return String(user.id ?? user._id ?? "");
}

function isManager(user: AuthUser) {
  return user.role === "teacher" || user.role === "admin";
}

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function isMongoDuplicateKeyError(
  error: unknown
): error is { code: number; keyPattern?: Record<string, 1>; keyValue?: Record<string, unknown> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBooleanParam(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toCourseProfileListItemDTO(course: {
  _id: Types.ObjectId;
  ownerTeacherId: Types.ObjectId;
  templateId: Types.ObjectId;
  templateVersion: number;
  code: string;
  internalName: string;
  status: ICourseProfile["status"];
  visibility: ICourseProfile["visibility"];
  courseType: ICourseProfile["courseType"];
  storefront: ICourseProfile["storefront"];
  publicationMeta: ICourseProfile["publicationMeta"];
  stats: ICourseProfile["stats"];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(course._id),
    ownerTeacherId: String(course.ownerTeacherId),
    templateId: String(course.templateId),
    templateVersion: course.templateVersion,

    code: course.code,
    internalName: course.internalName,
    status: course.status,
    visibility: course.visibility,
    courseType: course.courseType,

    isPublished: course.storefront.isPublished,
    publicTitle: course.storefront.publicTitle,
    slug: course.storefront.slug,
    enrollmentOpen: course.publicationMeta.enrollmentOpen,

    activeEnrollmentCount: course.stats.activeEnrollmentCount,
    lessonCount: course.stats.lessonCount,

    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

function toCourseProfileDetailDTO(course: {
  _id: Types.ObjectId;
  ownerTeacherId: Types.ObjectId;
  templateId: Types.ObjectId;
  templateVersion: number;
  code: string;
  internalName: string;
  description?: string;
  status: ICourseProfile["status"];
  visibility: ICourseProfile["visibility"];
  courseType: ICourseProfile["courseType"];
  regularPolicy?: ICourseProfile["regularPolicy"];
  privateFlexiblePolicy?: ICourseProfile["privateFlexiblePolicy"];
  consumptionPolicies: ICourseProfile["consumptionPolicies"];
  storefront: ICourseProfile["storefront"];
  publicationMeta: ICourseProfile["publicationMeta"];
  stats: ICourseProfile["stats"];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(course._id),
    ownerTeacherId: String(course.ownerTeacherId),
    templateId: String(course.templateId),
    templateVersion: course.templateVersion,

    code: course.code,
    internalName: course.internalName,
    description: course.description,

    status: course.status,
    visibility: course.visibility,
    courseType: course.courseType,

    regularPolicy: course.regularPolicy,
    privateFlexiblePolicy: course.privateFlexiblePolicy,
    consumptionPolicies: course.consumptionPolicies,

    storefront: course.storefront,
    publicationMeta: course.publicationMeta,
    stats: course.stats,

    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

function normalizePayloadByCourseType<T extends { courseType: string; regularPolicy?: unknown; privateFlexiblePolicy?: unknown }>(
  payload: T
): T {
  const isRegular =
    payload.courseType === "regular_group" || payload.courseType === "intensive_group";

  if (isRegular) {
    return {
      ...payload,
      privateFlexiblePolicy: undefined,
    };
  }

  return {
    ...payload,
    regularPolicy: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = (await requireAuth(request)) as AuthUser;

    if (!isManager(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 12), 100);
    const skip = (page - 1) * limit;

    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const visibility = searchParams.get("visibility");
    const courseType = searchParams.get("courseType");
    const isPublished = parseBooleanParam(searchParams.get("isPublished"));
    const enrollmentOpen = parseBooleanParam(searchParams.get("enrollmentOpen"));

    const sortBy = searchParams.get("sortBy") ?? "updatedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const ownerTeacherId = new Types.ObjectId(getCurrentUserId(user));

    const query: QueryFilter<ICourseProfile> = {
      ownerTeacherId,
    };

    if (status && COURSE_STATUSES.includes(status as (typeof COURSE_STATUSES)[number])) {
      query.status = status;
    }

    if (
      visibility &&
      COURSE_VISIBILITIES.includes(visibility as (typeof COURSE_VISIBILITIES)[number])
    ) {
      query.visibility = visibility;
    }

    if (
      courseType &&
      COURSE_TYPES.includes(courseType as (typeof COURSE_TYPES)[number])
    ) {
      query.courseType = courseType;
    }

    if (typeof isPublished === "boolean") {
      query["storefront.isPublished"] = isPublished;
    }

    if (typeof enrollmentOpen === "boolean") {
      query["publicationMeta.enrollmentOpen"] = enrollmentOpen;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { code: { $regex: safeSearch, $options: "i" } },
        { internalName: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { "storefront.publicTitle": { $regex: safeSearch, $options: "i" } },
        { "storefront.slug": { $regex: safeSearch, $options: "i" } },
      ];
    }

    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "code",
      "internalName",
      "status",
      "courseType",
    ]);

    const sortField = allowedSortFields.has(sortBy) ? sortBy : "updatedAt";

    const [totalItems, items] = await Promise.all([
      CourseProfile.countDocuments(query),
      CourseProfile.find(query)
        .sort({ [sortField]: sortOrder, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return NextResponse.json({
      items: items.map((course) =>
        toCourseProfileListItemDTO(course as unknown as Parameters<typeof toCourseProfileListItemDTO>[0])
      ),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json(
      { message: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = (await requireAuth(request)) as AuthUser;

    if (!isManager(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();

    const parsed = createCourseProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: formatZodError(parsed.error),
        },
        { status: 400 }
      );
    }

    const normalizedData = normalizePayloadByCourseType(parsed.data);

    const created = await CourseProfile.create({
      ...normalizedData,
      ownerTeacherId: new Types.ObjectId(getCurrentUserId(user)),
    });

    return NextResponse.json(
      {
        item: toCourseProfileDetailDTO(
          created.toObject() as Parameters<typeof toCourseProfileDetailDTO>[0]
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/courses error:", error);

    if (isMongoDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          message: "Duplicate value",
          fields: Object.keys(error.keyPattern ?? {}),
          keyValue: error.keyValue ?? {},
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Failed to create course" },
      { status: 500 }
    );
  }
}