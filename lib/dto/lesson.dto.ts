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

export interface LessonAttendeeDTO {
  studentId: string;
  voucherId?: string;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
}

export interface LessonBlockDTO {
  id?: string;

  title: string;
  type: LessonBlockType;

  cefrLevels: CefrLevel[];
  skills: LessonSkill[];
  tags: string[];
  resources: string[];

  plannedContent: string;
  actualContent?: string;

  plannedObjectives: string[];
  achievedObjectives: string[];

  estimatedMinutes?: number;
  actualMinutes?: number;

  blockSuccessRating?: number;
  studentDifficultyLevel?: number;
  engagementLevel?: number;

  primaryErrorCategory: LessonErrorCategory[];

  studentDifficultiesText?: string;
  teacherReflection?: string;
  nextStepSuggestion?: string;
}

export interface LessonListDTO {
  id: string;
  title: string;
  status: LessonStatus;
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

  creationSource: LessonCreationSource;

  integration?: {
    provider: "google_calendar" | "preply" | "italki" | "manual";
    externalId?: string;
    meetUrl?: string;
  };

  createdAt: string;
  updatedAt: string;
}