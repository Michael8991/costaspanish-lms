import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
  models,
} from "mongoose";

export const PAYMENT_LEDGER_SOURCES = [
  "voucher_created_paid",
  "voucher_marked_paid",
  "voucher_payment_updated",
  "voucher_payment_registered",
  "manual_adjustment",
] as const;

export type PaymentLedgerSource =
  (typeof PAYMENT_LEDGER_SOURCES)[number];
export type PaymentLedgerStatus = "active" | "reversed";
export type PaymentLedgerPaymentStatus = "paid" | "partial";
export type PaymentLedgerPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "bizum"
  | "card"
  | "other"
  | "";

export interface IPaymentLedgerEntry {
  teacherId: Types.ObjectId;
  studentId: Types.ObjectId;
  studentNameSnapshot: string;
  courseId?: Types.ObjectId | null;
  courseNameSnapshot: string;
  voucherId: Types.ObjectId;
  voucherNameSnapshot: string;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
  amount: number;
  amountCents?: number | null;
  currency: "EUR";
  paymentStatusSnapshot: PaymentLedgerPaymentStatus;
  paymentMethod: PaymentLedgerPaymentMethod;
  paidAt: Date;
  source: PaymentLedgerSource;
  status: PaymentLedgerStatus;
  reversedAt?: Date | null;
  reversedBy?: Types.ObjectId | null;
  reversalReason: string;
  notes: string;
  createdBy?: Types.ObjectId | null;
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentLedgerEntryDocument =
  HydratedDocument<IPaymentLedgerEntry>;

const PaymentLedgerEntrySchema = new Schema<IPaymentLedgerEntry>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "CourseProfile",
      default: null,
      index: true,
    },
    courseNameSnapshot: { type: String, trim: true, default: "" },
    voucherId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    voucherNameSnapshot: { type: String, trim: true, default: "" },
    billingPeriodStart: { type: Date, default: null },
    billingPeriodEnd: { type: Date, default: null },
    amount: { type: Number, required: true, min: 0 },
    amountCents: {
      type: Number,
      min: 1,
      default: null,
      validate: {
        validator: (value: number | null) => value === null || Number.isSafeInteger(value),
        message: "amountCents must be a safe integer",
      },
    },
    currency: {
      type: String,
      enum: ["EUR"],
      required: true,
      default: "EUR",
    },
    paymentStatusSnapshot: {
      type: String,
      enum: ["paid", "partial"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "bizum", "card", "other", ""],
      default: "",
    },
    paidAt: { type: Date, required: true },
    source: {
      type: String,
      enum: PAYMENT_LEDGER_SOURCES,
      required: true,
      default: "voucher_marked_paid",
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
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    idempotencyKey: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

PaymentLedgerEntrySchema.index({ teacherId: 1, paidAt: -1 });
PaymentLedgerEntrySchema.index({ teacherId: 1, studentId: 1, paidAt: -1 });
PaymentLedgerEntrySchema.index({ teacherId: 1, courseId: 1, paidAt: -1 });
PaymentLedgerEntrySchema.index({ teacherId: 1, voucherId: 1, status: 1 });
PaymentLedgerEntrySchema.index(
  { teacherId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "unique_payment_idempotency_key_per_teacher",
  },
);

export const PaymentLedgerEntry: Model<IPaymentLedgerEntry> =
  models.PaymentLedgerEntry ||
  model<IPaymentLedgerEntry>(
    "PaymentLedgerEntry",
    PaymentLedgerEntrySchema,
  );
