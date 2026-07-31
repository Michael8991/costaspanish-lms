import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
  models,
} from "mongoose";

export type CreditLedgerSource = "lesson_completion" | "manual_adjustment";
export type CreditLedgerStatus = "active" | "reversed";

export interface ICreditLedgerEntry {
  teacherId: Types.ObjectId;
  lessonId: Types.ObjectId;
  lessonTitleSnapshot: string;
  lessonDate: Date;
  courseId?: Types.ObjectId | null;
  courseNameSnapshot: string;
  studentId: Types.ObjectId;
  studentNameSnapshot: string;
  voucherId?: Types.ObjectId | null;
  voucherNameSnapshot: string;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
  creditsConsumed: number;
  voucherTotalCreditsSnapshot?: number | null;
  voucherPriceSnapshot?: number | null;
  unitCreditPriceSnapshot: number;
  estimatedRevenue: number;
  consumedAt: Date;
  source: CreditLedgerSource;
  status: CreditLedgerStatus;
  reversedAt?: Date | null;
  reversedBy?: Types.ObjectId | null;
  reversalReason: string;
  settlementReason?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreditLedgerEntryDocument =
  HydratedDocument<ICreditLedgerEntry>;

const CreditLedgerEntrySchema = new Schema<ICreditLedgerEntry>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    lessonTitleSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    lessonDate: { type: Date, required: true, index: true },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "CourseProfile",
      default: null,
      index: true,
    },
    courseNameSnapshot: { type: String, trim: true, default: "" },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      index: true,
    },
    studentNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    voucherId: { type: Schema.Types.ObjectId, default: null, index: true },
    voucherNameSnapshot: { type: String, trim: true, default: "" },
    billingPeriodStart: { type: Date, default: null },
    billingPeriodEnd: { type: Date, default: null },
    creditsConsumed: { type: Number, required: true, min: 0 },
    voucherTotalCreditsSnapshot: { type: Number, min: 0, default: null },
    voucherPriceSnapshot: { type: Number, min: 0, default: null },
    unitCreditPriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    estimatedRevenue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    consumedAt: { type: Date, required: true, index: true },
    source: {
      type: String,
      enum: ["lesson_completion", "manual_adjustment"],
      required: true,
      default: "lesson_completion",
    },
    status: {
      type: String,
      enum: ["active", "reversed"],
      required: true,
      default: "active",
      index: true,
    },
    reversedAt: { type: Date, default: null },
    reversedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reversalReason: { type: String, trim: true, default: "" },
    settlementReason: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true },
);

CreditLedgerEntrySchema.index({ teacherId: 1, consumedAt: -1 });
CreditLedgerEntrySchema.index({
  teacherId: 1,
  lessonId: 1,
  studentId: 1,
  status: 1,
});
CreditLedgerEntrySchema.index({ teacherId: 1, studentId: 1, consumedAt: -1 });
CreditLedgerEntrySchema.index({ teacherId: 1, courseId: 1, consumedAt: -1 });
CreditLedgerEntrySchema.index({ teacherId: 1, voucherId: 1, consumedAt: -1 });
CreditLedgerEntrySchema.index(
  { teacherId: 1, lessonId: 1, studentId: 1, source: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
      source: "lesson_completion",
    },
    name: "unique_active_lesson_credit_per_student",
  },
);

// TODO: Reverse CreditLedgerEntry when lesson completion is reverted.
export const CreditLedgerEntry: Model<ICreditLedgerEntry> =
  models.CreditLedgerEntry ||
  model<ICreditLedgerEntry>("CreditLedgerEntry", CreditLedgerEntrySchema);
