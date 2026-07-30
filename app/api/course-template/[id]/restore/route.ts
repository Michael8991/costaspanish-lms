import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { CourseTemplate } from "@/models/CourseTemplate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid course template id" },
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

    const templateId = new Types.ObjectId(id);
    const filter =
      user.role === "admin"
        ? { _id: templateId }
        : { _id: templateId, ownerTeacherId: currentUserObjectId };
    const courseTemplate = await CourseTemplate.findOne(filter);

    if (!courseTemplate) {
      return NextResponse.json(
        { error: "Course template not found" },
        { status: 404 },
      );
    }

    if (courseTemplate.status !== "archived") {
      return NextResponse.json(
        { error: "Only archived templates can be restored" },
        { status: 400 },
      );
    }

    courseTemplate.status = "draft";
    await courseTemplate.save();

    return NextResponse.json({
      item: toCourseTemplateDetailDTO(courseTemplate.toObject()),
    });
  } catch (error) {
    console.error(
      "POST /api/course-template/[id]/restore error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to restore course template" },
      { status: 500 },
    );
  }
}
