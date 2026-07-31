import { Types } from "mongoose";
import { CEFR_LEVELS, LESSON_ATTENDANCE_STATUSES, LESSON_BLOCK_TYPES, LESSON_CLASS_TYPES, LESSON_CREATION_SOURCES, LESSON_ERROR_CATEGORIES, LESSON_SKILLS, LESSON_STATUSES } from "../constants/lesson.constants";
import { LESSON_PREPARATION_STATUSES } from "@/lib/constants/lesson.constants";
import { LESSON_BLOCK_COMPLETION_STATUSES } from "@/lib/constants/lesson.constants";


export type LessonBlockCompletionStatus =
  (typeof LESSON_BLOCK_COMPLETION_STATUSES)[number];

export type LessonStatus = (typeof LESSON_STATUSES)[number];

export type LessonAttendanceStatus = (typeof LESSON_ATTENDANCE_STATUSES)[number];

export type LessonClassType = (typeof LESSON_CLASS_TYPES)[number];

export type LessonBlockType = (typeof LESSON_BLOCK_TYPES)[number];

export type LessonSkill = (typeof LESSON_SKILLS)[number];

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type LessonErrorCategory = (typeof LESSON_ERROR_CATEGORIES)[number];

export type LessonCreationSource = (typeof LESSON_CREATION_SOURCES)[number];

export type LessonPreparationStatus =
  (typeof LESSON_PREPARATION_STATUSES)[number];

export type LessonCourseRelationType =
  | "course_free_lesson"
  | "template_based"
  | "review"
  | "makeup"
  | "extra"
  | "imported_historical"
  | "legacy_free";

export interface LessonSourceTemplateLesson {
  moduleOrder: number;
  lessonOrder: number;
  moduleTitle?: string;
  lessonTitle?: string;
}

export interface LessonCourseLink {
  relationType: LessonCourseRelationType;
  linkedAt?: Date;
  linkedBy?: Types.ObjectId;
  notes?: string;
  sourceTemplateLesson?: LessonSourceTemplateLesson;
}

export interface LessonPolicySnapshot {
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
}

export type LessonCreditSettlementStatus =
  | "pending"
  | "settled"
  | "skipped"
  | "failed";

export type LessonCreditSettlementSource =
  | "course_policy"
  | "course_policy_fallback"
  | "legacy_attendees";

export type LessonCreditPolicySource =
  | "lesson_snapshot"
  | "course_profile"
  | "legacy";

export type LessonCreditSettlementReason =
  | "attended"
  | "trial_free"
  | "no_show_charged"
  | "no_show_free"
  | "absent_free"
  | "scheduled_policy_not_processed_on_completion"
  | "legacy"
  | "no_voucher_required";

export interface LessonCreditSettlementItem {
  studentId: Types.ObjectId;
  voucherId?: Types.ObjectId | null;
  attendanceStatus?: LessonAttendanceStatus;
  isTrial: boolean;
  creditsPlanned: number;
  creditsConsumed: number;
  reason: LessonCreditSettlementReason;
  previousCreditsRemaining?: number | null;
  newCreditsRemaining?: number | null;
  notes?: string;
}

export interface LessonCreditSettlement {
  status: LessonCreditSettlementStatus;
  source: LessonCreditSettlementSource;
  policySource: LessonCreditPolicySource;
  consumeOn: "completion" | "scheduled" | "legacy";
  settledAt?: Date | null;
  settledBy?: Types.ObjectId | null;
  totalCreditsConsumed: number;
  items: LessonCreditSettlementItem[];
  warnings?: string[];
}

export interface LessonAttendee {
  studentId: Types.ObjectId;
  voucherId?: Types.ObjectId;
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
}

export interface LessonBlockOrigin {
  sourceType?: "lesson" | "course_template";
  sourceLessonId?: Types.ObjectId;
  sourceBlockId?: Types.ObjectId;
  sourceCourseId?: Types.ObjectId;
  sourceTemplateId?: Types.ObjectId;
  sourceModuleOrder?: number;
  sourceLessonOrder?: number;
  sourceStudentIds: Types.ObjectId[];
  sourceLessonTitle?: string;
  sourceLessonDate?: Date;
  sourceBlockTitle?: string;
}

export interface LessonBlock{
    lineageId?: string;
    order?: number;
    title: string;
    type: LessonBlockType;
    categories?: LessonBlockType[];

    cerfLevels: CefrLevel[];
    skills: LessonSkill[];
    tags: string[];
    resources: Types.ObjectId;

    plannedContent: string;
    actualContent?: string;

    plannedObjectives?: string[];
    achivedObjectives?: string[];

    estimatedMinutes?: number;
    actualMinutes?: number;

    blockSuccessRating?: number;
    studentDifficultyLevel: number;
  engagementLevel?: number;
  completionStatus?: LessonBlockCompletionStatus;
carryOverToNextLesson?: boolean;

    errorCategories?: LessonErrorCategory[];

    studentDifficultiesText?: string;
    teacherReflection?: string;
    nextStepSuggestion?: string;
    origin?: LessonBlockOrigin;
}

export interface Lesson{
    _id: Types.ObjectId;

    teacherId: Types.ObjectId;
    courseId?: Types.ObjectId;
    courseTemplateId?: Types.ObjectId;
    courseTemplateVersion?: number;
    courseLink?: LessonCourseLink;
    policySnapshot?: LessonPolicySnapshot;
    creditSettlement?: LessonCreditSettlement;
    sourceTemplateLesson?: LessonSourceTemplateLesson;

    title: string;
    status: LessonStatus;
    preparationStatus: LessonPreparationStatus;

    scheduledStart: Date;
    scheduledEnd: Date;
    timeZone?: string;

    classType: LessonClassType;
    isTrial: boolean;

    attendees: LessonAttendee[];
    blocks: LessonBlock[];

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

    createdAt: Date;
    updatedAt: Date;
}
