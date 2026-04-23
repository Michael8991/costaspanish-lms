import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/mongo";
import { requireAuth } from "@/lib/auth/apiAuth";
import { CourseProfile } from "@/models/CourseProfile";
import { createCourseProfileSchema } from "@/lib/validators/course.validator";

export const runtime = "nodejs";

type AuthUser = {
  id?: string;
  _id?: string;
  role?: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
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

function toCourseProfileDetailDTO(course: {
  _id: Types.ObjectId;
  ownerTeacherId: Types.ObjectId;
  templateId: Types.ObjectId;
  templateVersion: number;
  code: string;
  internalName: string;
  description?: string;
  status: string;
  visibility: string;
  courseType: string;
  regularPolicy?: unknown;
  privateFlexiblePolicy?: unknown;
  consumptionPolicies: unknown;
  storefront: unknown;
  publicationMeta: unknown;
  stats: unknown;
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

function toMutableCoursePayload(doc: InstanceType<typeof CourseProfile>) {
  const plain = doc.toObject();

  return {
    templateId: String(plain.templateId),
    templateVersion: plain.templateVersion,

    code: plain.code,
    internalName: plain.internalName,
    description: plain.description,

    status: plain.status,
    visibility: plain.visibility,
    courseType: plain.courseType,

    regularPolicy: plain.regularPolicy,
    privateFlexiblePolicy: plain.privateFlexiblePolicy,
    consumptionPolicies: plain.consumptionPolicies,

    storefront: plain.storefront,
    publicationMeta: plain.publicationMeta,
    stats: plain.stats,
  };
}

function mergeCourseProfilePatch(
  current: ReturnType<typeof toMutableCoursePayload>,
  patch: Partial<ReturnType<typeof toMutableCoursePayload>>
) {
  return {
    ...current,
    ...patch,

    regularPolicy:
      patch.regularPolicy === undefined ? current.regularPolicy : patch.regularPolicy,

    privateFlexiblePolicy:
      patch.privateFlexiblePolicy === undefined
        ? current.privateFlexiblePolicy
        : patch.privateFlexiblePolicy,

    consumptionPolicies: patch.consumptionPolicies
      ? {
          ...current.consumptionPolicies,
          ...patch.consumptionPolicies,
          attendance:
            patch.consumptionPolicies.attendance ?? current.consumptionPolicies.attendance,
          noShow: patch.consumptionPolicies.noShow ?? current.consumptionPolicies.noShow,
          teacherCancellation:
            patch.consumptionPolicies.teacherCancellation ??
            current.consumptionPolicies.teacherCancellation,
          studentCancellationRules:
            patch.consumptionPolicies.studentCancellationRules ??
            current.consumptionPolicies.studentCancellationRules,
        }
      : current.consumptionPolicies,

    storefront: patch.storefront
      ? {
          ...current.storefront,
          ...patch.storefront,
          priceOptions: patch.storefront.priceOptions ?? current.storefront.priceOptions,
          benefits: patch.storefront.benefits ?? current.storefront.benefits,
        }
      : current.storefront,

    publicationMeta: patch.publicationMeta
      ? {
          ...current.publicationMeta,
          ...patch.publicationMeta,
        }
      : current.publicationMeta,

    stats: patch.stats
      ? {
          ...current.stats,
          ...patch.stats,
        }
      : current.stats,
  };
}

async function findOwnedCourseOrNull(id: string, user: AuthUser) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return CourseProfile.findOne({
    _id: new Types.ObjectId(id),
    ownerTeacherId: new Types.ObjectId(getCurrentUserId(user)),
  });
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const user = (await requireAuth(_)) as AuthUser;

    if (!isManager(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const course = await findOwnedCourseOrNull(id, user);

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: toCourseProfileDetailDTO(course.toObject()),
    });
  } catch (error) {
    console.error("GET /api/courses/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to fetch course" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = (await requireAuth(request)) as AuthUser;

    if (!isManager(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const patch = await request.json();

    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return NextResponse.json(
        { message: "PATCH body must be an object" },
        { status: 400 }
      );
    }

    const course = await findOwnedCourseOrNull(id, user);

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const currentPayload = toMutableCoursePayload(course);
    const mergedPayload = mergeCourseProfilePatch(currentPayload, patch);
    const normalizedPayload = normalizePayloadByCourseType(mergedPayload);

    const parsed = createCourseProfileSchema.safeParse(normalizedPayload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: formatZodError(parsed.error),
        },
        { status: 400 }
      );
    }

    course.set(parsed.data);
    await course.save();

    return NextResponse.json({
      item: toCourseProfileDetailDTO(course.toObject()),
    });
  } catch (error) {
    console.error("PATCH /api/courses/[id] error:", error);

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
      { message: "Failed to update course" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const user = (await requireAuth(_)) as AuthUser;

    if (!isManager(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid course id" }, { status: 400 });
    }

    const deleted = await CourseProfile.findOneAndDelete({
      _id: new Types.ObjectId(id),
      ownerTeacherId: new Types.ObjectId(getCurrentUserId(user)),
    });

    if (!deleted) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Course deleted successfully",
        id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/courses/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete course" },
      { status: 500 }
    );
  }
}