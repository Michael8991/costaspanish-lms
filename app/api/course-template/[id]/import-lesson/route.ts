import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { formatZodError } from "@/lib/server/course-template.api";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import {
  buildTemplateLessonFromLesson,
  type LessonForTemplateImport,
} from "@/lib/utils/lesson-to-template-lesson";
import { importLessonToTemplateSchema } from "@/lib/validators/courseTemplate.validator";
import {
  CourseTemplate,
  type IModuleData,
  type ITemplateLesson,
} from "@/models/CourseTemplate";
import Lesson from "@/models/Lesson";

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
        { error: "Invalid course template id" },
        { status: 400 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsedBody = importLessonToTemplateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: formatZodError(parsedBody.error),
        },
        { status: 400 },
      );
    }

    const { lessonId, targetModuleOrder, insertAt, importOptions } =
      parsedBody.data;
    if (!Types.ObjectId.isValid(lessonId)) {
      return NextResponse.json(
        { error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);
    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    const templateFilter =
      user.role === "admin"
        ? { _id: new Types.ObjectId(id) }
        : {
            _id: new Types.ObjectId(id),
            ownerTeacherId: currentUserObjectId,
          };
    const lessonFilter =
      user.role === "admin"
        ? { _id: new Types.ObjectId(lessonId) }
        : {
            _id: new Types.ObjectId(lessonId),
            teacherId: currentUserObjectId,
          };

    const [courseTemplate, lesson] = await Promise.all([
      CourseTemplate.findOne(templateFilter),
      Lesson.findOne(lessonFilter).lean(),
    ]);

    if (!courseTemplate) {
      return NextResponse.json(
        { error: "Plantilla de curso no encontrada." },
        { status: 404 },
      );
    }
    if (courseTemplate.status === "archived") {
      return NextResponse.json(
        { error: "No se puede modificar una plantilla archivada." },
        { status: 409 },
      );
    }
    if (!lesson) {
      return NextResponse.json(
        { error: "Clase real no encontrada." },
        { status: 404 },
      );
    }

    const modules: IModuleData[] =
      courseTemplate.curriculum?.modules ?? [];
    const targetModule = modules.find(
      (module, index) =>
        (module.order ?? index) === targetModuleOrder,
    );

    if (!targetModule) {
      return NextResponse.json(
        { error: "El módulo de destino no existe." },
        { status: 400 },
      );
    }

    const lessons: ITemplateLesson[] = targetModule.lessons ?? [];
    const insertionIndex =
      insertAt !== undefined && insertAt <= lessons.length
        ? insertAt
        : lessons.length;
    const importedLesson = buildTemplateLessonFromLesson({
      lesson: lesson as unknown as LessonForTemplateImport,
      titleOverride: parsedBody.data.titleOverride,
      descriptionOverride: parsedBody.data.descriptionOverride,
      teacherNotes: parsedBody.data.teacherNotes,
      useActualContent: importOptions.useActualContent,
      includeResources: importOptions.includeResources,
      selectedBlockIds: importOptions.selectedBlockIds,
      insertOrder: insertionIndex,
    });

    lessons.splice(insertionIndex, 0, importedLesson);
    targetModule.lessons = lessons.map((templateLesson, index) => {
      templateLesson.order = index;
      return templateLesson;
    });

    courseTemplate.markModified("curriculum.modules");
    await courseTemplate.save();

    const blocks = importedLesson.blocks ?? [];
    const resourcesCount = new Set(
      blocks.flatMap((block) => (block.resources ?? []).map(String)),
    ).size;

    return NextResponse.json({
      ok: true,
      item: toCourseTemplateDetailDTO(courseTemplate.toObject()),
      importedLesson: {
        moduleOrder: targetModuleOrder,
        lessonOrder: insertionIndex,
        title: importedLesson.title,
        blocksCount: blocks.length,
        resourcesCount,
      },
    });
  } catch (error) {
    console.error("POST /api/course-template/[id]/import-lesson error:", error);
    return NextResponse.json(
      { error: "No se pudo importar la clase real." },
      { status: 500 },
    );
  }
}
