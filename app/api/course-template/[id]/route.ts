import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import { formatZodError } from "@/lib/server/course-template.api";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { CourseTemplate } from "@/models/CourseTemplate";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { updateCourseTemplateSchema } from "@/lib/validators/courseTemplate.validator";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const routeParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .refine((value) => Types.ObjectId.isValid(value), {
      message: "Invalid course template id",
    }),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const rawParams = await context.params;
    const parsedParams = routeParamsSchema.safeParse(rawParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid route params",
          details: formatZodError(parsedParams.error),
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid current user id" },
        { status: 500 },
      );
    }

    const templateId = new Types.ObjectId(parsedParams.data.id);

    const query =
      user.role === "admin"
        ? { _id: templateId }
        : { _id: templateId, ownerTeacherId: currentUserObjectId };

    const courseTemplate = await CourseTemplate.findOne(query).lean();

    if (!courseTemplate) {
      return NextResponse.json(
        {
          ok: false,
          error: "Plantilla de curso no encontrada.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: toCourseTemplateDetailDTO(courseTemplate),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Error en GET /api/course-templates/[id]:", errorMessage);

    return NextResponse.json(
      {
        ok: false,
        error: "Error al obtener la plantilla del curso",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const parsedParams = routeParamsSchema.safeParse(await context.params);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid route params",
          details: formatZodError(parsedParams.error),
        },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateCourseTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }

    const set: Record<string, unknown> = {};

    if (parsed.data.code !== undefined) {
      set.code = parsed.data.code.toUpperCase();
    }
    if (parsed.data.internalName !== undefined) {
      set.internalName = parsed.data.internalName;
    }
    if (parsed.data.status !== undefined) {
      set.status = parsed.data.status;
    }
    if (parsed.data.version !== undefined) {
      set.version = parsed.data.version;
    }
    if (parsed.data.pedagogicalMeta !== undefined) {
      set.pedagogicalMeta = parsed.data.pedagogicalMeta;
    }
    if (parsed.data.storefront !== undefined) {
      set.storefront = parsed.data.storefront;
    }
    if (parsed.data.curriculum !== undefined) {
      set.curriculum = parsed.data.curriculum;
    }
    if (parsed.data.operationalDefaults !== undefined) {
      set.operationalDefaults = parsed.data.operationalDefaults;
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid current user id" },
        { status: 500 },
      );
    }

    const templateId = new Types.ObjectId(parsedParams.data.id);
    const filter =
      user.role === "admin"
        ? { _id: templateId }
        : { _id: templateId, ownerTeacherId: currentUserObjectId };
    const courseTemplate = await CourseTemplate.findOneAndUpdate(
      filter,
      { $set: set },
      { new: true, runValidators: true },
    );

    if (!courseTemplate) {
      return NextResponse.json(
        { ok: false, error: "Plantilla de curso no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: toCourseTemplateDetailDTO(courseTemplate.toObject()),
    });
  } catch (error) {
    const mongoError = error as { code?: number };

    if (mongoError.code === 11000) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A course template with this code already exists for this teacher",
        },
        { status: 409 },
      );
    }

    console.error("Error in PATCH /api/course-template/[id]:", error);

    return NextResponse.json(
      { ok: false, error: "Error al actualizar la plantilla del curso" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const parsedParams = routeParamsSchema.safeParse(await context.params);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid route params",
          details: formatZodError(parsedParams.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid current user id" },
        { status: 500 },
      );
    }

    const templateId = new Types.ObjectId(parsedParams.data.id);
    const filter =
      user.role === "admin"
        ? { _id: templateId }
        : { _id: templateId, ownerTeacherId: currentUserObjectId };
    const courseTemplate = await CourseTemplate.findOneAndUpdate(
      filter,
      { $set: { status: "archived" } },
      { new: true, runValidators: true },
    );

    if (!courseTemplate) {
      return NextResponse.json(
        { ok: false, error: "Plantilla de curso no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: toCourseTemplateDetailDTO(courseTemplate.toObject()),
    });
  } catch (error) {
    console.error("Error in DELETE /api/course-template/[id]:", error);

    return NextResponse.json(
      { ok: false, error: "Error al archivar la plantilla del curso" },
      { status: 500 },
    );
  }
}
