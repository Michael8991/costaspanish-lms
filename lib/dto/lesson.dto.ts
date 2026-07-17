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

export interface LessonBlockResourceDTO{
  id: string;
  title: string;
  format: string;
  url?: string;
  thumbnailUrl?: string;
}

export type LessonPreparationStatus = "needs_preparation" | "prepared";

export interface LessonAttendeeDTO {
  studentId: string;
  voucherId?: string;
  studentName?: string;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
}

export interface LessonBlockDTO {
  _id?: string;

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

  errorCategories: LessonErrorCategory[];

  studentDifficultiesText?: string;
  teacherReflection?: string;
  nextStepSuggestion?: string;
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

