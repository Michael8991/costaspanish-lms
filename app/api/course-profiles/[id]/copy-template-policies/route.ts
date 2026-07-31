import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { toCourseProfileDetailDTO } from "@/lib/utils/course-profile.mapper";
import { cloneCourseOperationalPolicies } from "@/lib/utils/course-policies";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { CourseProfile } from "@/models/CourseProfile";
import { CourseTemplate } from "@/models/CourseTemplate";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid course profile id" },
        { status: 400 },
      );
    }

    const currentUserObjectId = getCurrentUserObjectId(user);
    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    await dbConnect();

    const courseFilter =
      user.role === "admin"
        ? { _id: new Types.ObjectId(id) }
        : {
            _id: new Types.ObjectId(id),
            ownerTeacherId: currentUserObjectId,
          };
    const course = await CourseProfile.findOne(courseFilter);

    if (!course) {
      return NextResponse.json(
        { error: "Curso no encontrado." },
        { status: 404 },
      );
    }

    const template = await CourseTemplate.findById(course.templateId).lean();
    if (!template) {
      return NextResponse.json(
        { error: "La plantilla asociada ya no está disponible." },
        { status: 404 },
      );
    }

    const templateDTO = toCourseTemplateDetailDTO(template);
    course.policies = cloneCourseOperationalPolicies(
      templateDTO.operationalDefaults,
    );
    course.markModified("policies");
    await course.save();
    await course.populate({
      path: "studentIds",
      select: "fullName contactEmail level isActive",
    });
    await course.populate({
      path: "members.studentId",
      select: "fullName contactEmail level isActive",
    });

    return NextResponse.json({
      item: toCourseProfileDetailDTO(course.toObject()),
    });
  } catch (error) {
    console.error(
      "POST /api/course-profiles/[id]/copy-template-policies error:",
      error,
    );
    return NextResponse.json(
      { error: "No se pudieron copiar las reglas de la plantilla." },
      { status: 500 },
    );
  }
}
