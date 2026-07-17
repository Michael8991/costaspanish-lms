import mongoose, { Schema } from "mongoose";
import {
  CEFR_LEVELS,
  LESSON_ATTENDANCE_STATUSES,
  LESSON_BLOCK_TYPES,
  LESSON_CLASS_TYPES,
  LESSON_CREATION_SOURCES,
  LESSON_ERROR_CATEGORIES,
  LESSON_PREPARATION_STATUSES,
  LESSON_SKILLS,
  LESSON_STATUSES,
} from "@/lib/constants/lesson.constants";

const LessonAttendeeSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    voucherId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    attendanceStatus: {
      type: String,
      enum: LESSON_ATTENDANCE_STATUSES,
      default: "pending",
    },
    creditsToConsume: {
      type: Number,
      default: 1,
      min: 0,
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const LessonBlockSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: LESSON_BLOCK_TYPES,
      required: true,
    },

    cefrLevels: {
      type: [String],
      enum: CEFR_LEVELS,
      default: [],
    },
    skills: {
      type: [String],
      enum: LESSON_SKILLS,
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    resources: [
      {
        type: Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],

    plannedContent: {
      type: String,
      required: true,
      trim: true,
    },
    actualContent: {
      type: String,
      trim: true,
    },

    plannedObjectives: {
      type: [String],
      default: [],
    },
    achievedObjectives: {
      type: [String],
      default: [],
    },

    estimatedMinutes: {
      type: Number,
      min: 0,
    },
    actualMinutes: {
      type: Number,
      min: 0,
    },

    blockSuccessRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    studentDifficultyLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    engagementLevel: {
      type: Number,
      min: 1,
      max: 5,
    },

    errorCategories: {
      type: [String],
      enum: LESSON_ERROR_CATEGORIES,
      default: [],
    },

    studentDifficultiesText: {
      type: String,
      trim: true,
    },
    teacherReflection: {
      type: String,
      trim: true,
    },
    nextStepSuggestion: {
      type: String,
      trim: true,
    },
  },
  { timestamps: false },
);

const LessonSchema = new Schema(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    courseId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: LESSON_STATUSES,
      default: "scheduled",
      required: true,
      index: true,
    },
    
    preparationStatus: {
      type: String,
      enum: LESSON_PREPARATION_STATUSES,
      default: "needs_preparation",
      required: true,
    },

    scheduledStart: {
      type: Date,
      required: true,
      index: true,
    },

    scheduledEnd: {
      type: Date,
      required: true,
    },

    timezone: {
      type: String,
      default: "Europe/Madrid",
      required: true,
    },

    classType: {
      type: String,
      enum: LESSON_CLASS_TYPES,
      required: true,
      index: true,
    },

    isTrial: {
      type: Boolean,
      default: false,
    },

    attendees: {
      type: [LessonAttendeeSchema],
      default: [],
    },

    blocks: {
      type: [LessonBlockSchema],
      default: [],
    },

    preparationNotes: {
      type: String,
      trim: true,
    },

    teacherNotes: {
      type: String,
      trim: true,
    },

    homeworkAssigned: {
      type: String,
      trim: true,
    },

    nextLessonFocus: {
      type: String,
      trim: true,
    },

    creationSource: {
      type: String,
      enum: LESSON_CREATION_SOURCES,
      default: "manual",
      required: true,
    },

    integration: {
      provider: {
        type: String,
        enum: ["google_calendar", "preply", "italki", "manual"],
      },
      externalId: String,
      meetUrl: String,
    },
  },
  { timestamps: true },
);

LessonSchema.index({ teacherId: 1, scheduledStart: 1 });
LessonSchema.index({ "attendees.studentId": 1, scheduledStart: -1 });
LessonSchema.index({"attendees.voucherId":1})

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
export default Lesson;