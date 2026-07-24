import { randomUUID } from "crypto";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { LESSON_BLOCK_TYPES } from "@/lib/constants/lesson.constants";
import type { AddLessonResourcesResponse } from "@/lib/dto/lesson-resource.dto";
import dbConnect from "@/lib/mongo";
import type { LessonBlockType } from "@/lib/types/lesson";
import Lesson from "@/models/Lesson";
import { Resource } from "@/models/ResourceProfile";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "Invalid ObjectId");

const addResourcesSchema = z.object({
  resourceIds: z.array(objectIdSchema).min(1).max(20),
  target: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("existing_block"),
      blockId: z.string().trim().min(1),
    }),
    z.object({
      mode: z.literal("new_block"),
      title: z.string().trim().min(1).max(180),
      type: z.enum(LESSON_BLOCK_TYPES).default("custom"),
      estimatedMinutes: z.number().int().min(0).max(600).default(10),
    }),
  ]),
});

interface LessonResourceBlockDocument {
  _id?: Types.ObjectId;
  lineageId?: string;
  order?: number;
  title: string;
  type: LessonBlockType;
  categories?: LessonBlockType[];
  cefrLevels?: string[];
  skills?: string[];
  tags?: string[];
  resources?: Types.ObjectId[];
  plannedContent: string;
  plannedObjectives?: string[];
  achievedObjectives?: string[];
  estimatedMinutes?: number;
  completionStatus?: "not_completed";
  carryOverToNextLesson?: boolean;
  errorCategories?: string[];
}

interface LessonResourceDocument {
  _id: Types.ObjectId;
  blocks: LessonResourceBlockDocument[];
  save(): Promise<unknown>;
}

interface ResourceAccessSource {
  _id: Types.ObjectId;
  title?: string;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id: lessonId } = await context.params;

    if (!Types.ObjectId.isValid(lessonId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    const parsed = addResourcesSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body",
          details: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    const lessonFilter =
      user.role === "admin"
        ? { _id: new Types.ObjectId(lessonId) }
        : {
            _id: new Types.ObjectId(lessonId),
            teacherId: currentUserObjectId,
          };
    const lesson = (await Lesson.findOne(
      lessonFilter,
    ).exec()) as LessonResourceDocument | null;

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    const requestedResourceIds = uniqueIds(parsed.data.resourceIds);
    const requestedObjectIds = requestedResourceIds.map(
      (resourceId) => new Types.ObjectId(resourceId),
    );
    const resourceAccessFilter =
      user.role === "admin"
        ? {
            _id: { $in: requestedObjectIds },
            status: { $nin: ["archived", "deleted"] },
          }
        : {
            _id: { $in: requestedObjectIds },
            status: { $nin: ["archived", "deleted"] },
            $or: [
              { ownerTeacherId: currentUserObjectId },
              { visibility: "shared", status: "published" },
            ],
          };
    const accessibleResources = await Resource.find(resourceAccessFilter)
      .select("_id title")
      .lean<ResourceAccessSource[]>();

    if (accessibleResources.length !== requestedResourceIds.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Algún recurso no existe o no está disponible para este usuario",
        },
        { status: 404 },
      );
    }

    const resourceIdsAlreadyInLesson = new Set(
      lesson.blocks.flatMap((block) =>
        (block.resources ?? []).map((resourceId) => resourceId.toString()),
      ),
    );
    const skippedResourceIds = requestedResourceIds.filter((resourceId) =>
      resourceIdsAlreadyInLesson.has(resourceId),
    );
    const addedResourceIds = requestedResourceIds.filter(
      (resourceId) => !resourceIdsAlreadyInLesson.has(resourceId),
    );
    const target = parsed.data.target;
    const existingBlockId =
      target.mode === "existing_block"
        ? target.blockId
        : null;
    const existingTargetBlock = existingBlockId
      ? lesson.blocks.find(
          (block) =>
            block._id?.toString() === existingBlockId ||
            block.lineageId === existingBlockId,
        )
      : undefined;

    if (
      target.mode === "existing_block" &&
      !existingTargetBlock
    ) {
      return NextResponse.json(
        { ok: false, error: "Lesson block not found" },
        { status: 404 },
      );
    }

    if (addedResourceIds.length > 0) {
      const addedObjectIds = addedResourceIds.map(
        (resourceId) => new Types.ObjectId(resourceId),
      );

      if (target.mode === "existing_block" && existingTargetBlock) {
        existingTargetBlock.resources = [
          ...(existingTargetBlock.resources ?? []),
          ...addedObjectIds,
        ];
      } else if (target.mode === "new_block") {
        const firstResourceTitle =
          accessibleResources
            .find(
              (resource) =>
                resource._id.toString() === addedResourceIds[0],
            )
            ?.title?.trim() || target.title;

        lesson.blocks.push({
          lineageId: randomUUID(),
          order: lesson.blocks.length,
          title: target.title,
          type: target.type,
          categories: [target.type],
          cefrLevels: [],
          skills: [],
          tags: [],
          resources: addedObjectIds,
          plannedContent: `Trabajar con el material: ${firstResourceTitle}`,
          plannedObjectives: [],
          achievedObjectives: [],
          estimatedMinutes: target.estimatedMinutes,
          completionStatus: "not_completed",
          carryOverToNextLesson: false,
          errorCategories: [],
        });
      }

      await lesson.save();
    }

    const response: AddLessonResourcesResponse = {
      ok: true,
      addedResourceIds,
      skippedResourceIds,
      lessonId: lesson._id.toString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error POST /api/lessons/[id]/resources:", error);

    return NextResponse.json(
      { ok: false, error: "Error al agregar el material a la clase" },
      { status: 500 },
    );
  }
}
