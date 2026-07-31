import { Types } from "mongoose";

import type { CefrLevel, LessonBlockType, LessonSkill } from "@/lib/types/lesson";
import type { ITemplateLesson } from "@/models/CourseTemplate";

export interface LessonBlockForTemplateImport {
  _id?: Types.ObjectId | string;
  id?: Types.ObjectId | string;
  order?: number;
  title: string;
  type?: LessonBlockType | string;
  categories?: Array<LessonBlockType | string>;
  plannedContent?: string;
  actualContent?: string;
  plannedObjectives?: string[];
  achievedObjectives?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  cefrLevels?: CefrLevel[];
  skills?: LessonSkill[];
  tags?: string[];
  resources?: Array<Types.ObjectId | string>;
}

export interface LessonForTemplateImport {
  title: string;
  scheduledStart?: Date | string;
  scheduledEnd?: Date | string;
  blocks?: LessonBlockForTemplateImport[];
}

interface BuildTemplateLessonFromLessonParams {
  lesson: LessonForTemplateImport;
  titleOverride?: string;
  descriptionOverride?: string;
  teacherNotes?: string;
  useActualContent?: boolean;
  includeResources?: boolean;
  selectedBlockIds?: string[];
  insertOrder: number;
}

function cleanUniqueStrings(values: readonly string[] | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  );
}

export function getLessonBlockImportId(
  block: Pick<LessonBlockForTemplateImport, "_id" | "id" | "order">,
  index: number,
): string {
  const documentId = block._id ?? block.id;

  if (documentId) {
    return String(documentId);
  }

  return `order:${block.order ?? index}`;
}

function getScheduledDurationMinutes(
  lesson: LessonForTemplateImport,
): number | undefined {
  if (!lesson.scheduledStart || !lesson.scheduledEnd) return undefined;

  const start = new Date(lesson.scheduledStart).getTime();
  const end = new Date(lesson.scheduledEnd).getTime();
  const duration = Math.round((end - start) / 60_000);

  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

function toResourceObjectIds(
  resources: Array<Types.ObjectId | string> | undefined,
): Types.ObjectId[] {
  const ids = new Map<string, Types.ObjectId>();

  for (const resource of resources ?? []) {
    const value = String(resource);
    if (!Types.ObjectId.isValid(value)) continue;
    ids.set(value, new Types.ObjectId(value));
  }

  return Array.from(ids.values());
}

export function buildTemplateLessonFromLesson({
  lesson,
  titleOverride,
  descriptionOverride,
  teacherNotes,
  useActualContent = true,
  includeResources = true,
  selectedBlockIds,
  insertOrder,
}: BuildTemplateLessonFromLessonParams): ITemplateLesson {
  const selectedIds = new Set(selectedBlockIds ?? []);
  const sourceBlocks = lesson.blocks ?? [];
  const selectedBlocks =
    selectedIds.size === 0
      ? sourceBlocks
      : sourceBlocks.filter((block, index) =>
          selectedIds.has(getLessonBlockImportId(block, index)),
        );

  // Templates must not store student-specific execution data.
  const blocks = selectedBlocks.map((block, index) => {
    const actualObjectives = cleanUniqueStrings(block.achievedObjectives);
    const plannedObjectives = cleanUniqueStrings(block.plannedObjectives);
    const type = block.type?.trim() || "custom";

    return {
      title: block.title.trim(),
      type,
      categories: cleanUniqueStrings([...(block.categories ?? []), type]),
      plannedContent:
        useActualContent && block.actualContent?.trim()
          ? block.actualContent.trim()
          : block.plannedContent?.trim() ?? "",
      plannedObjectives:
        useActualContent && actualObjectives.length > 0
          ? actualObjectives
          : plannedObjectives,
      estimatedMinutes:
        useActualContent && block.actualMinutes !== undefined
          ? block.actualMinutes
          : (block.estimatedMinutes ?? 10),
      cefrLevels: [...(block.cefrLevels ?? [])],
      skills: cleanUniqueStrings(block.skills),
      tags: cleanUniqueStrings(block.tags),
      resources: includeResources
        ? toResourceObjectIds(block.resources)
        : [],
      order: index,
    };
  });

  const objectives = cleanUniqueStrings(
    blocks.flatMap((block) => block.plannedObjectives),
  );
  const blockMinutes = blocks.reduce(
    (total, block) => total + (block.estimatedMinutes ?? 0),
    0,
  );

  return {
    title: titleOverride?.trim() || lesson.title.trim(),
    description: descriptionOverride?.trim() ?? "",
    order: insertOrder,
    estimatedMinutes:
      blockMinutes > 0
        ? blockMinutes
        : (getScheduledDurationMinutes(lesson) ?? 60),
    objectives,
    teacherNotes: teacherNotes?.trim() ?? "",
    blocks,
  };
}
