import {
  LessonAttendeeDTO,
  LessonBlockDTO,
  LessonDetailDTO,
  LessonListDTO,
} from "@/lib/dto/lesson.dto";
import { Types } from "mongoose";
import {
  LessonAttendanceStatus,
  LessonBlockType,
  LessonClassType,
  LessonCreationSource,
  LessonErrorCategory,
  LessonSkill,
  LessonStatus,
  CefrLevel,
  LessonPreparationStatus,
  LessonBlockCompletionStatus,
} from "@/lib/types/lesson";
import {
  calculateScheduledDurationMinutes,
  calculateTotalActualMinutes,
  calculateTotalEstimatedMinutes,
} from "@/lib/utils/lesson-duration";
import { normalizeLessonBlockCategories } from "@/lib/utils/lesson-block-categories";

interface RawLessonAttendee {
  studentId: Types.ObjectId;
  voucherId?: Types.ObjectId;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
}

interface RawLessonBlock {
  _id?: Types.ObjectId;
  lineageId?: string;
  order?: number;

  title: string;
  type: LessonBlockType;
  categories?: LessonBlockType[];

  cefrLevels?: CefrLevel[];
  skills?: LessonSkill[];
  tags?: string[];
  resources?: Types.ObjectId[];

  plannedContent: string;
  actualContent?: string;

  plannedObjectives?: string[];
  achievedObjectives?: string[];

  estimatedMinutes?: number;
  actualMinutes?: number;

  blockSuccessRating?: number;
  studentDifficultyLevel?: number;
  engagementLevel?: number;
  completionStatus?: LessonBlockCompletionStatus;
  carryOverToNextLesson?: boolean;

  errorCategories?: LessonErrorCategory[];

  studentDifficultiesText?: string;
  teacherReflection?: string;
  nextStepSuggestion?: string;
  origin?: {
    sourceType?: "lesson" | "course_template";
    sourceLessonId?: Types.ObjectId | string;
    sourceBlockId?: Types.ObjectId | string;
    sourceCourseId?: Types.ObjectId | string;
    sourceTemplateId?: Types.ObjectId | string;
    sourceModuleOrder?: number;
    sourceLessonOrder?: number;
    sourceStudentIds?: Array<Types.ObjectId | string>;
    sourceLessonTitle?: string;
    sourceLessonDate?: Date | string;
    sourceBlockTitle?: string;
  };
}

interface IntegrationDetail {
  provider: "google_calendar" | "preply" | "italki" | "manual";
  externalId?: string;
  meetUrl?: string;
}

interface RawCourseReference {
  _id: Types.ObjectId;
  name?: string;
  internalName?: string;
}

interface RawMongoLesson {
  _id: Types.ObjectId;

  teacherId: Types.ObjectId;
  courseId?: Types.ObjectId | RawCourseReference;
  courseTemplateId?: Types.ObjectId;
  courseTemplateVersion?: number;
  courseLink?: {
    relationType:
      | "course_free_lesson"
      | "template_based"
      | "review"
      | "makeup"
      | "extra"
      | "imported_historical"
      | "legacy_free";
    linkedAt?: Date | string;
    linkedBy?: Types.ObjectId | string;
    notes?: string;
    sourceTemplateLesson?: {
      moduleOrder: number;
      lessonOrder: number;
      moduleTitle?: string;
      lessonTitle?: string;
    };
  };
  policySnapshot?: {
    lessonDefaults: {
      durationMinutes: number;
      timezone: string;
      defaultClassType: LessonClassType;
    };
    creditPolicy: {
      creditsPerLesson: number;
      consumeOn: "completion" | "scheduled";
      trialConsumesCredit: boolean;
      cancellationConsumesCredit: boolean;
      noShowConsumesCredit: boolean;
    };
    preparationPolicy: {
      copyTemplateBlocksToLesson: boolean;
      copyTemplateResourcesToLesson: boolean;
      defaultPreparationStatus: LessonPreparationStatus;
    };
  };
  creditSettlement?: {
    status: "pending" | "settled" | "skipped" | "failed";
    source:
      | "course_policy"
      | "course_policy_fallback"
      | "legacy_attendees";
    policySource: "lesson_snapshot" | "course_profile" | "legacy";
    consumeOn: "completion" | "scheduled" | "legacy";
    settledAt?: Date | string | null;
    settledBy?: Types.ObjectId | string | null;
    totalCreditsConsumed?: number;
    items?: Array<{
      studentId: Types.ObjectId | string;
      voucherId?: Types.ObjectId | string | null;
      attendanceStatus?: LessonAttendanceStatus;
      isTrial?: boolean;
      creditsPlanned?: number;
      creditsConsumed?: number;
      reason:
        | "attended"
        | "trial_free"
        | "no_show_charged"
        | "no_show_free"
        | "absent_free"
        | "scheduled_policy_not_processed_on_completion"
        | "legacy"
        | "no_voucher_required";
      previousCreditsRemaining?: number | null;
      newCreditsRemaining?: number | null;
      notes?: string;
    }>;
    warnings?: string[];
  };
  sourceTemplateLesson?: {
    moduleOrder: number;
    lessonOrder: number;
    moduleTitle?: string;
    lessonTitle?: string;
  };

  title: string;
  status: LessonStatus;
  preparationStatus?: LessonPreparationStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;

  classType: LessonClassType;
  isTrial?: boolean;

  attendees?: RawLessonAttendee[];
  blocks?: RawLessonBlock[];

  preparationNotes?: string;
  teacherNotes?: string;
  homeworkAssigned?: string;
  nextLessonFocus?: string;

  creationSource: LessonCreationSource;
  integration?: IntegrationDetail;

  createdAt: Date;
  updatedAt: Date;
}

const toId = (value: unknown): string | undefined => {
  if (!value) return undefined;

  if (typeof value === "object" && "_id" in value) {
    return String(value._id);
  }

  return String(value);
};

const getCourseName = (
  value: Types.ObjectId | RawCourseReference | undefined,
): string | null => {
  if (!value || value instanceof Types.ObjectId) return null;

  return value.name?.trim() || value.internalName?.trim() || null;
};

const toISOString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
};

export function toLessonListDTO(lesson: RawMongoLesson): LessonListDTO {
  const blocks = lesson.blocks ?? [];

  return {
    id: String(lesson._id),
    courseId: toId(lesson.courseId),
    courseName: getCourseName(lesson.courseId),
    courseTemplateId: toId(lesson.courseTemplateId),
    courseTemplateVersion: lesson.courseTemplateVersion,
    courseLink: lesson.courseLink
      ? {
          relationType: lesson.courseLink.relationType,
          linkedAt: lesson.courseLink.linkedAt
            ? toISOString(lesson.courseLink.linkedAt)
            : null,
          linkedBy: toId(lesson.courseLink.linkedBy) ?? null,
          notes: lesson.courseLink.notes ?? "",
          sourceTemplateLesson: lesson.courseLink.sourceTemplateLesson
            ? { ...lesson.courseLink.sourceTemplateLesson }
            : null,
        }
      : null,
    policySnapshot: lesson.policySnapshot
      ? {
          lessonDefaults: { ...lesson.policySnapshot.lessonDefaults },
          creditPolicy: { ...lesson.policySnapshot.creditPolicy },
          preparationPolicy: { ...lesson.policySnapshot.preparationPolicy },
        }
      : undefined,
    sourceTemplateLesson: lesson.sourceTemplateLesson
      ? {
          moduleOrder: lesson.sourceTemplateLesson.moduleOrder,
          lessonOrder: lesson.sourceTemplateLesson.lessonOrder,
          moduleTitle: lesson.sourceTemplateLesson.moduleTitle,
          lessonTitle: lesson.sourceTemplateLesson.lessonTitle,
        }
      : undefined,
    title: lesson.title,
    status: lesson.status,
    preparationStatus: lesson.preparationStatus ?? "needs_preparation",
    scheduledStart: toISOString(lesson.scheduledStart),
    scheduledEnd: toISOString(lesson.scheduledEnd),
    isTrial: lesson.isTrial ?? false,
    timezone: lesson.timezone,
    classType: lesson.classType,
    attendeesCount: lesson.attendees?.length ?? 0,
    blocksCount: blocks.length,
    resourcesCount: new Set(
      blocks.flatMap((block) => (block.resources ?? []).map(String)),
    ).size,
    totalEstimatedMinutes: calculateTotalEstimatedMinutes(blocks),
    totalActualMinutes: calculateTotalActualMinutes(blocks),
    scheduledDurationMinutes: calculateScheduledDurationMinutes(
      lesson.scheduledStart,
      lesson.scheduledEnd,
    ),
  };
}

export function toLessonDetailDTO(lesson: RawMongoLesson): LessonDetailDTO {
  const attendees: LessonAttendeeDTO[] = (lesson.attendees ?? []).map(
    (attendee) => ({
      studentId: attendee.studentId.toString(),
      voucherId: attendee.voucherId?.toString(),
      attendanceStatus: attendee.attendanceStatus,
      creditsToConsume: attendee.creditsToConsume,
      isTrial: attendee.isTrial ?? false,
    }),
  );

  const blocks: LessonBlockDTO[] = (lesson.blocks ?? [])
    .map((block, index) => ({
      id: toId(block._id),
      _id: toId(block._id),
      lineageId: block.lineageId,
      order: block.order ?? index,

      title: block.title,
      type: block.type,
      categories: normalizeLessonBlockCategories(
        block.type,
        block.categories,
      ),

      cefrLevels: block.cefrLevels ?? [],
      skills: block.skills ?? [],
      tags: block.tags ?? [],
      resources: (block.resources ?? []).map(String),

      plannedContent: block.plannedContent,
      actualContent: block.actualContent,

      plannedObjectives: block.plannedObjectives ?? [],
      achievedObjectives: block.achievedObjectives ?? [],

      estimatedMinutes: block.estimatedMinutes,
      actualMinutes: block.actualMinutes,

      blockSuccessRating: block.blockSuccessRating,
      studentDifficultyLevel: block.studentDifficultyLevel,
      engagementLevel: block.engagementLevel,
      completionStatus: block.completionStatus ?? "not_completed",
      carryOverToNextLesson: block.carryOverToNextLesson ?? false,

      errorCategories: block.errorCategories ?? [],

      studentDifficultiesText: block.studentDifficultiesText,
      teacherReflection: block.teacherReflection,
      nextStepSuggestion: block.nextStepSuggestion,
      origin: block.origin
        ? {
            sourceType: block.origin.sourceType,
            sourceLessonId: toId(block.origin.sourceLessonId),
            sourceBlockId: toId(block.origin.sourceBlockId),
            sourceCourseId: toId(block.origin.sourceCourseId),
            sourceTemplateId: toId(block.origin.sourceTemplateId),
            sourceModuleOrder: block.origin.sourceModuleOrder,
            sourceLessonOrder: block.origin.sourceLessonOrder,
            sourceStudentIds: (block.origin.sourceStudentIds ?? []).map(String),
            sourceLessonTitle: block.origin.sourceLessonTitle,
            sourceLessonDate: block.origin.sourceLessonDate
              ? toISOString(block.origin.sourceLessonDate)
              : undefined,
            sourceBlockTitle: block.origin.sourceBlockTitle,
          }
        : undefined,
    }))
    .sort((firstBlock, secondBlock) =>
      (firstBlock.order ?? 0) - (secondBlock.order ?? 0),
    );

  const totalEstimatedMinutes = calculateTotalEstimatedMinutes(blocks);
  const totalActualMinutes = calculateTotalActualMinutes(blocks);
  const scheduledDurationMinutes = calculateScheduledDurationMinutes(
    lesson.scheduledStart,
    lesson.scheduledEnd,
  );

  return {
    ...toLessonListDTO(lesson),

    teacherId: String(lesson.teacherId),
    creditSettlement: lesson.creditSettlement
      ? {
          status: lesson.creditSettlement.status,
          source: lesson.creditSettlement.source,
          policySource: lesson.creditSettlement.policySource,
          consumeOn: lesson.creditSettlement.consumeOn,
          settledAt: lesson.creditSettlement.settledAt
            ? toISOString(lesson.creditSettlement.settledAt)
            : null,
          settledBy: toId(lesson.creditSettlement.settledBy) ?? null,
          totalCreditsConsumed:
            lesson.creditSettlement.totalCreditsConsumed ?? 0,
          items: (lesson.creditSettlement.items ?? []).map((item) => ({
            studentId: String(item.studentId),
            voucherId: toId(item.voucherId) ?? null,
            attendanceStatus: item.attendanceStatus,
            isTrial: item.isTrial ?? false,
            creditsPlanned: item.creditsPlanned ?? 0,
            creditsConsumed: item.creditsConsumed ?? 0,
            reason: item.reason,
            previousCreditsRemaining:
              item.previousCreditsRemaining ?? null,
            newCreditsRemaining: item.newCreditsRemaining ?? null,
            notes: item.notes,
          })),
          warnings: lesson.creditSettlement.warnings ?? [],
        }
      : null,

    attendees,
    blocks,
    totalEstimatedMinutes,
    totalActualMinutes,
    scheduledDurationMinutes,

    preparationNotes: lesson.preparationNotes,
    teacherNotes: lesson.teacherNotes,
    homeworkAssigned: lesson.homeworkAssigned,
    nextLessonFocus: lesson.nextLessonFocus,

    creationSource: lesson.creationSource,

    integration: lesson.integration
      ? {
          provider: lesson.integration.provider,
          externalId: lesson.integration.externalId,
          meetUrl: lesson.integration.meetUrl,
        }
      : undefined,

    createdAt: toISOString(lesson.createdAt),
    updatedAt: toISOString(lesson.updatedAt),
  };
}
