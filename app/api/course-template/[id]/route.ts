import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { formatZodError } from "@/lib/server/course-template.api";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { CourseTemplate } from "@/models/CourseTemplate";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

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

function getCurrentUserId(user: { id?: string; _id?: string }) {
  return String(user.id ?? user._id ?? "");
}

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

    const currentUserId = getCurrentUserId(user);

    const query =
      user.role === "admin"
        ? { _id: parsedParams.data.id }
        : { _id: parsedParams.data.id, ownerTeacherId: currentUserId };

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