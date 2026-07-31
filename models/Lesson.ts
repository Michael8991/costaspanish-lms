import mongoose, { Schema } from "mongoose";
import {
  CEFR_LEVELS,
  LESSON_ATTENDANCE_STATUSES,
  LESSON_BLOCK_COMPLETION_STATUSES,
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

const LessonBlockOriginSchema = new Schema(
  {
    sourceType: {
      type: String,
      enum: ["lesson", "course_template"],
      required: false,
    },
    sourceLessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: false,
    },
    sourceBlockId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    sourceCourseId: {
      type: Schema.Types.ObjectId,
      ref: "CourseProfile",
      required: false,
    },
    sourceTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "CourseTemplate",
      required: false,
    },
    sourceModuleOrder: {
      type: Number,
      min: 0,
      required: false,
    },
    sourceLessonOrder: {
      type: Number,
      min: 0,
      required: false,
    },
    sourceStudentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "StudentProfile",
      },
    ],
    sourceLessonTitle: {
      type: String,
      trim: true,
    },
    sourceLessonDate: {
      type: Date,
    },
    sourceBlockTitle: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const LessonBlockSchema = new Schema(
  {
    lineageId: {
      type: String,
      required: false,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
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
    categories: {
      type: [String],
      enum: LESSON_BLOCK_TYPES,
      default: undefined,
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
    completionStatus: {
      type: String,
      enum: LESSON_BLOCK_COMPLETION_STATUSES,
      default: "not_completed",
    },

    carryOverToNextLesson: {
      type: Boolean,
      default: false,
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
    origin: {
      type: LessonBlockOriginSchema,
      required: false,
    },
  },
  { timestamps: false },
);

const SourceTemplateLessonSchema = new Schema(
  {
    moduleOrder: {
      type: Number,
      min: 0,
      required: true,
    },
    lessonOrder: {
      type: Number,
      min: 0,
      required: true,
    },
    moduleTitle: {
      type: String,
      trim: true,
    },
    lessonTitle: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const CourseLinkSchema = new Schema(
  {
    relationType: {
      type: String,
      enum: [
        "course_free_lesson",
        "template_based",
        "review",
        "makeup",
        "extra",
        "imported_historical",
        "legacy_free",
      ],
      required: true,
    },
    linkedAt: {
      type: Date,
    },
    linkedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    sourceTemplateLesson: {
      type: SourceTemplateLessonSchema,
      required: false,
    },
  },
  { _id: false },
);

const LessonPolicySnapshotSchema = new Schema(
  {
    lessonDefaults: {
      durationMinutes: {
        type: Number,
        min: 1,
        required: true,
      },
      timezone: {
        type: String,
        trim: true,
        required: true,
      },
      defaultClassType: {
        type: String,
        enum: LESSON_CLASS_TYPES,
        required: true,
      },
    },
    creditPolicy: {
      creditsPerLesson: {
        type: Number,
        min: 0,
        required: true,
      },
      consumeOn: {
        type: String,
        enum: ["completion", "scheduled"],
        required: true,
      },
      trialConsumesCredit: {
        type: Boolean,
        required: true,
      },
      cancellationConsumesCredit: {
        type: Boolean,
        required: true,
      },
      noShowConsumesCredit: {
        type: Boolean,
        required: true,
      },
    },
    preparationPolicy: {
      copyTemplateBlocksToLesson: {
        type: Boolean,
        required: true,
      },
      copyTemplateResourcesToLesson: {
        type: Boolean,
        required: true,
      },
      defaultPreparationStatus: {
        type: String,
        enum: LESSON_PREPARATION_STATUSES,
        required: true,
      },
    },
  },
  { _id: false },
);

const LessonCreditSettlementItemSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    voucherId: {
      type: Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    attendanceStatus: {
      type: String,
      enum: LESSON_ATTENDANCE_STATUSES,
      required: false,
    },
    isTrial: {
      type: Boolean,
      required: true,
      default: false,
    },
    creditsPlanned: {
      type: Number,
      min: 0,
      required: true,
    },
    creditsConsumed: {
      type: Number,
      min: 0,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "attended",
        "trial_free",
        "no_show_charged",
        "no_show_free",
        "absent_free",
        "scheduled_policy_not_processed_on_completion",
        "legacy",
        "no_voucher_required",
      ],
      required: true,
    },
    previousCreditsRemaining: {
      type: Number,
      min: 0,
      required: false,
      default: null,
    },
    newCreditsRemaining: {
      type: Number,
      min: 0,
      required: false,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const LessonCreditSettlementSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "settled", "skipped", "failed"],
      required: true,
    },
    source: {
      type: String,
      enum: [
        "course_policy",
        "course_policy_fallback",
        "legacy_attendees",
      ],
      required: true,
    },
    policySource: {
      type: String,
      enum: ["lesson_snapshot", "course_profile", "legacy"],
      required: true,
    },
    consumeOn: {
      type: String,
      enum: ["completion", "scheduled", "legacy"],
      required: true,
    },
    settledAt: {
      type: Date,
      required: false,
      default: null,
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    totalCreditsConsumed: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    items: {
      type: [LessonCreditSettlementItemSchema],
      default: [],
    },
    warnings: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
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
      ref: "CourseProfile",
      required: false,
      index: true,
    },

    courseTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "CourseTemplate",
      required: false,
      index: true,
    },

    courseTemplateVersion: {
      type: Number,
      min: 1,
      required: false,
    },

    sourceTemplateLesson: {
      type: SourceTemplateLessonSchema,
      required: false,
    },

    courseLink: {
      type: CourseLinkSchema,
      required: false,
    },

    policySnapshot: {
      type: LessonPolicySnapshotSchema,
      required: false,
    },

    creditSettlement: {
      type: LessonCreditSettlementSchema,
      required: false,
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
      default: "",
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
LessonSchema.index({
  courseId: 1,
  "sourceTemplateLesson.moduleOrder": 1,
  "sourceTemplateLesson.lessonOrder": 1,
});
LessonSchema.index({ "attendees.voucherId": 1 });

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
export default Lesson;
