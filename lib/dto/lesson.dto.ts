import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import {
  CefrLevel,
  LessonAttendanceStatus,
  LessonBlockType,
  LessonClassType,
  LessonCreationSource,
  LessonErrorCategory,
  LessonSkill,
  LessonStatus,
} from "@/lib/types/lesson";
import { isoToDatetimeLocalValue } from "@/lib/utils/time-zone";

export interface LessonBlockResourceDTO{
  id: string;
  title: string;
  format: string;
  url?: string;
  thumbnailUrl?: string;
}

export type LessonPreparationStatus = "needs_preparation" | "prepared";
export type LessonBlockCompletionStatus =
  | "completed"
  | "partially_completed"
  | "not_completed"
  | "skipped";

export interface LessonAttendeeDTO {
  studentId: string;
  voucherId?: string;
  studentName?: string;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
}

export interface LessonBlockOriginDTO {
  sourceLessonId: string;
  sourceBlockId?: string;
  sourceCourseId?: string;
  sourceStudentIds: string[];
  sourceLessonTitle?: string;
  sourceLessonDate?: string;
  sourceBlockTitle?: string;
}

export interface LessonBlockDTO {
  _id?: string;
  lineageId?: string;

  title: string;
  type: LessonBlockType;

  cefrLevels: CefrLevel[];
  skills: LessonSkill[];
  tags: string[];
  resources: string[];
  resourceItems?: LessonBlockResourceDTO[];

  plannedContent: string;
  actualContent?: string;

  plannedObjectives: string[];
  achievedObjectives: string[];

  estimatedMinutes?: number;
  actualMinutes?: number;

  blockSuccessRating?: number;
  studentDifficultyLevel?: number;
  engagementLevel?: number;
  completionStatus: LessonBlockCompletionStatus;
  carryOverToNextLesson?: boolean;

  errorCategories: LessonErrorCategory[];

  studentDifficultiesText?: string;
  teacherReflection?: string;
  nextStepSuggestion?: string;
  origin?: LessonBlockOriginDTO;
}

export interface LessonListDTO {
  id: string;
  title: string;
  status: LessonStatus;
  preparationStatus: LessonPreparationStatus;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  classType: LessonClassType;
  isTrial: boolean;
  attendeesCount: number;
  blocksCount: number;
}

export interface LessonDetailDTO extends LessonListDTO {
  teacherId: string;
  courseId?: string;

  attendees: LessonAttendeeDTO[];
  blocks: LessonBlockDTO[];

  preparationNotes?: string;
  teacherNotes?: string;
  homeworkAssigned?: string;
  nextLessonFocus?: string;
  preparationStatus: LessonPreparationStatus;

  creationSource: LessonCreationSource;

  integration?: {
    provider: "google_calendar" | "preply" | "italki" | "manual";
    externalId?: string;
    meetUrl?: string;
  };

  createdAt: string;
  updatedAt: string;
}


export function mapLessonToFormValues(
  lesson: LessonDetailDTO,
): AddLessonFormValues {
  return {
    courseId: lesson.courseId,
    title: lesson.title,
    classType: lesson.classType,
    scheduledStart: isoToDatetimeLocalValue(
      lesson.scheduledStart,
      lesson.timezone,
    ),
    scheduledEnd: isoToDatetimeLocalValue(
      lesson.scheduledEnd,
      lesson.timezone,
    ),
    timezone: lesson.timezone,

    attendees: lesson.attendees.map((attendee) => ({
      studentId: attendee.studentId,
      voucherId: attendee.voucherId ?? "",
      attendanceStatus: "pending",
      creditsToConsume: attendee.creditsToConsume ?? 1,
      isTrial: attendee.isTrial ?? false,
    })),

    preparationNotes: lesson.preparationNotes ?? "",
    homeworkAssigned: lesson.homeworkAssigned ?? "",
    nextLessonFocus: lesson.nextLessonFocus ?? "",

    blocks: lesson.blocks.map((block) => ({
      lineageId: block.lineageId,
      title: block.title,
      type: block.type,
      cefrLevels: block.cefrLevels ?? [],
      skills: block.skills ?? [],
      tags: block.tags ?? [],
      resources: block.resources ?? [],
      plannedContent: block.plannedContent,
      actualContent: block.actualContent,
      plannedObjectives: block.plannedObjectives ?? [],
      achievedObjectives: block.achievedObjectives ?? [],
      estimatedMinutes: block.estimatedMinutes,
      actualMinutes: block.actualMinutes,
      blockSuccessRating: block.blockSuccessRating,
      studentDifficultyLevel: block.studentDifficultyLevel,
      engagementLevel: block.engagementLevel,
      errorCategories: block.errorCategories ?? [],
      studentDifficultiesText: block.studentDifficultiesText,
      teacherReflection: block.teacherReflection,
      nextStepSuggestion: block.nextStepSuggestion,
      completionStatus: block.completionStatus ?? "not_completed",
      carryOverToNextLesson: block.carryOverToNextLesson ?? false,
      origin: block.origin,
    })),

    syncGoogleCalendar: false,
  };
}
