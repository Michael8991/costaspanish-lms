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
    sourceLessonId?: Types.ObjectId | string;
    sourceBlockId?: Types.ObjectId | string;
    sourceCourseId?: Types.ObjectId | string;
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

interface RawMongoLesson {
  _id: Types.ObjectId;

  teacherId: Types.ObjectId;
  courseId?: Types.ObjectId;

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
  return String(value);
};

const toISOString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
};

export function toLessonListDTO(lesson: RawMongoLesson): LessonListDTO {
  return {
    id: String(lesson._id),
    title: lesson.title,
    status: lesson.status,
    preparationStatus: lesson.preparationStatus ?? "needs_preparation",
    scheduledStart: toISOString(lesson.scheduledStart),
    scheduledEnd: toISOString(lesson.scheduledEnd),
    isTrial: lesson.isTrial ?? false,
    timezone: lesson.timezone,
    classType: lesson.classType,
    attendeesCount: lesson.attendees?.length ?? 0,
    blocksCount: lesson.blocks?.length ?? 0,
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
      origin: block.origin?.sourceLessonId
        ? {
            sourceLessonId: String(block.origin.sourceLessonId),
            sourceBlockId: toId(block.origin.sourceBlockId),
            sourceCourseId: toId(block.origin.sourceCourseId),
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
    courseId: toId(lesson.courseId),

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
