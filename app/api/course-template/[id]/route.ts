import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { formatZodError } from "@/lib/server/course-template.api";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { courseTemplateDbSchema } from "@/lib/validators/courseTemplate.validator";
import { CourseTemplate } from "@/models/CourseTemplate";
import { details } from "framer-motion/client";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getCurrentUserId(user: { id?: string; _id?: string }) {
  return String(user.id ?? user._id ?? "");
}

function isOwner(
  resourceOwnerId: unknown,
  currentUserObjectId: Types.ObjectId
): boolean {
  if (!resourceOwnerId) return false;
  return String(resourceOwnerId) === String(currentUserObjectId);
}

export async function GET(_: NextRequest, context: RouteContext) {
    try {
        const user = await requireAuth(_);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!requireRole(user, ["teacher", "admin"])) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rawParams = await context.params
        const parsedParams = courseTemplateDbSchema.safeParse(rawParams);

        if (!parsedParams.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid route params",
                    details: formatZodError(parsedParams.error)
                },
                { status: 400 }
            );
        }

        await dbConnect();

        const courseTemplate = await CourseTemplate.findById(parsedParams.data.code);

        if (!courseTemplate) {
            return NextResponse.json({
                ok: false,
                error: "Plantilla de curso no encontrada."
            },
                { status: 404 }
            );
        }


        //No se si seria fundamental pasar a continuacion el id del usuario actual.
        return NextResponse.json(
            { item: toCourseTemplateDetailDTO(courseTemplate.toObject()) }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown message";
        console.log("Error en GET /api/courseTemplate/[id]:", errorMessage)
        return NextResponse.json(
            {
                error: "Error al obtener la plantilla del curso"
            },
            {status: 500}
        )
    }
}