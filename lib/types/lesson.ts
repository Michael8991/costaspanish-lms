import { Types } from "mongoose";
import { CEFR_LEVELS, LESSON_ATTENDANCE_STATUSES, LESSON_BLOCK_TYPES, LESSON_CLASS_TYPES, LESSON_CREATION_SOURCES, LESSON_ERROR_CATEGORIES, LESSON_SKILLS, LESSON_STATUSES } from "../constants/lesson.constants";

export type LessonStatus = (typeof LESSON_STATUSES)[number];

export type LessonAttendanceStatus = (typeof LESSON_ATTENDANCE_STATUSES)[number];

export type LessonClassType = (typeof LESSON_CLASS_TYPES)[number];

export type LessonBlockTypes = (typeof LESSON_BLOCK_TYPES)[number];

export type LessonSkill = (typeof LESSON_SKILLS)[number];

export type CerfLevel = (typeof CEFR_LEVELS)[number];

export type LessonErrorCategories = (typeof LESSON_ERROR_CATEGORIES)[number];

export type LessonCreationSources = (typeof LESSON_CREATION_SOURCES)[number];

export interface LessonAttendee{
    studentId: Types.ObjectId;
    voucherId: Types.ObjectId;
    attendanceStatus: LessonAttendanceStatus;
    creditsToConsume?: number;
}

export interface LessonBlock{
    title: string;
    type: LessonBlockTypes;

    cerfLevels: CerfLevel[];
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

    primaryErrorCategory?: LessonErrorCategories;

    studentDifficultiesText?: string;
    teacherReflection?: string;
    nextStepSuggestion?: string;
}

export interface Lesson{
    _id: Types.ObjectId;

    teacherId: Types.ObjectId;
    courseId: Types.ObjectId;

    title: string;
    status: LessonStatus;

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

    creationSource: LessonCreationSources;

    integration?: {
        provider: "google_calendar" | "preply" | "italki" | "manual";
        externalId?: string;
        meetUrl?: string;
    };

    createdAt: Date;
    updateAt: Date;
}