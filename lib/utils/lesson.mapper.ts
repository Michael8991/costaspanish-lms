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
} from "@/lib/types/lesson";

interface RawLessonAttendee {
  studentId: Types.ObjectId;
  voucherId?: Types.ObjectId;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
}

interface RawLessonBlock {
  _id?: Types.ObjectId;

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

  errorCategories?: LessonErrorCategory[];

  studentDifficultiesText?: string;
  teacherReflection?: string;
  nextStepSuggestion?: string;
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

  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;

  classType: LessonClassType;
  isTrial: boolean;

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
    scheduledStart: toISOString(lesson.scheduledStart),
    scheduledEnd: toISOString(lesson.scheduledEnd),
    timezone: lesson.timezone,
    classType: lesson.classType,
    isTrial: Boolean(lesson.isTrial),
    attendeesCount: lesson.attendees?.length ?? 0,
    blocksCount: lesson.blocks?.length ?? 0,
  };
}

export function toLessonDetailDTO(lesson: RawMongoLesson): LessonDetailDTO {
  const attendees: LessonAttendeeDTO[] = (lesson.attendees ?? []).map(
    (attendee) => ({
      studentId: String(attendee.studentId),
      voucherId: toId(attendee.voucherId),
      attendanceStatus: attendee.attendanceStatus,
      creditsToConsume: attendee.creditsToConsume,
    }),
  );

  const blocks: LessonBlockDTO[] = (lesson.blocks ?? []).map((block) => ({
    id: toId(block._id),

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

    errorCategories: block.errorCategories ?? [],

    studentDifficultiesText: block.studentDifficultiesText,
    teacherReflection: block.teacherReflection,
    nextStepSuggestion: block.nextStepSuggestion,
  }));

  return {
    ...toLessonListDTO(lesson),

    teacherId: String(lesson.teacherId),
    courseId: toId(lesson.courseId),

    attendees,
    blocks,

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