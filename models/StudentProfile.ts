import { Model } from "mongoose";
import { model, models, Schema, Types } from "mongoose";

export type PlanBillingType = "single" | "package" | "subscription";
export type ClassType = "private" | "pair" | "group_regular" | "semi_intensive" | "intensive";
export type PlanStatus = "active" | "exhausted" | "expired" | "canceled";
export type VoucherPaymentStatus = "pending" | "paid" | "partial" | "waived";
export type PlanPaymentStatus = VoucherPaymentStatus;
export type VoucherPaymentMethod =
    | "cash"
    | "bank_transfer"
    | "bizum"
    | "card"
    | "other"
    | "";
export type VoucherCreatedFrom =
    | "manual"
    | "course_profile"
    | "migration"
    | "legacy";
export type AcademicLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Evaluando";

export interface PlanDoc { 
    _id: Types.ObjectId;
    name: string;
    billingType: PlanBillingType;
    classType: ClassType;
    creditsTotal?: number;
    creditsRemaining?: number;
    validFrom: Date;
    validUntil: Date;
    status: PlanStatus;
    price: number;
    courseId?: Types.ObjectId;
    courseNameSnapshot?: string;
    billingPeriodStart?: Date | null;
    billingPeriodEnd?: Date | null;
    billingMode?: "individual_cycle" | null;
    billingAnchorDay?: number | null;
    generatedFromCourse?: boolean;
    generatedFromCourseMember?: boolean;
    paymentStatus?: PlanPaymentStatus;
    amountPaid?: number;
    paidAt?: Date | null;
    paymentMethod?: VoucherPaymentMethod;
    paymentNotes?: string;
    internalNotes?: string;
    priceTotal?: number;
    currency?: "EUR";
    unitCreditPriceSnapshot?: number | null;
    createdFrom?: VoucherCreatedFrom;
    notes?: string;
}

export interface StudentProfileDoc{
    _id: Types.ObjectId;
    teacherId?: Types.ObjectId;
    userId?: Types.ObjectId;
    contactEmail: string;
    contactEmailLower: string;
    fullName: string;
    phone?: string;
    
    country?: string;
    nativeLanguage?: string;
    timezone: string;
    level: AcademicLevel;
    goals: string[];
    
    internalNotes?: string;
    
    activePlans: PlanDoc[];
    
    isActive: boolean;
    
    createdAt: Date;
    updatedAt: Date;
}

const PlanSchema = new Schema<PlanDoc>({
    name: { type: String, required: true },
    billingType: { type: String, enum:["single", "package","subscription"], required: true},
    classType: { type: String, enum: ["private", "pair", "group_regular", "semi_intensive", "intensive"], required: true },
    creditsTotal: { type: Number },
    creditsRemaining: { type: Number },
    validFrom: { type: Date, default: () => new Date() },
    validUntil: { type: Date, required: true },
    status: { type: String, enum: ["active", "exhausted", "expired", "canceled"], default: "active" },
    price: { type: Number, required: true, default: 0 },
    courseId: { type: Schema.Types.ObjectId, ref: "CourseProfile" },
    courseNameSnapshot: { type: String, trim: true, maxlength: 160 },
    billingPeriodStart: { type: Date },
    billingPeriodEnd: { type: Date },
    billingMode: { type: String, enum: ["individual_cycle"] },
    billingAnchorDay: { type: Number, min: 1, max: 31 },
    generatedFromCourse: { type: Boolean, default: false },
    generatedFromCourseMember: { type: Boolean, default: false },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "partial", "waived"],
        default: "pending",
    },
    amountPaid: { type: Number, min: 0, default: 0 },
    paidAt: { type: Date, default: null },
    paymentMethod: {
        type: String,
        enum: ["cash", "bank_transfer", "bizum", "card", "other", ""],
        default: "",
    },
    paymentNotes: { type: String, trim: true, maxlength: 1000, default: "" },
    internalNotes: { type: String, trim: true, maxlength: 2000, default: "" },
    priceTotal: { type: Number, min: 0 },
    currency: { type: String, enum: ["EUR"], default: "EUR" },
    unitCreditPriceSnapshot: { type: Number, min: 0, default: null },
    createdFrom: {
        type: String,
        enum: ["manual", "course_profile", "migration", "legacy"],
        default: "manual",
    },
    notes: { type: String, trim: true, maxlength: 1000 },
})

const StudentProfileSchema = new Schema<StudentProfileDoc>({
    teacherId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
        index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    contactEmail: { type: String, required: true, trim: true },
    contactEmailLower: {type: String, required: true, unique: true, index: true, trim: true},
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    
    phone: { type: String, trim: true, maxlength: 30 },
    country: { type: String, trim: true },
    timezone: { type: String, default:"Europe/Madrid"},
    
    level: { type: String, enum:["A1" , "A2" , "B1" , "B2" , "C1" , "C2" , "Evaluando"], default: "Evaluando"},
    nativeLanguage: { type: String, trim: true},
    goals: [{ type: String, trim: true}],
    internalNotes: { type: String},
    
    activePlans: [PlanSchema],

    isActive: { type: Boolean, default: true, index: true},
}, { timestamps: true });

StudentProfileSchema.index(
    { userId: 1 },
    {unique: true, partialFilterExpression:{userId:{$exists: true}}}
)

// TODO: make teacherId required after backfilling existing students.
StudentProfileSchema.index({ teacherId: 1, isActive: 1, createdAt: -1 });
StudentProfileSchema.index({ teacherId: 1, fullName: 1 });
StudentProfileSchema.index({ teacherId: 1, contactEmail: 1 });

StudentProfileSchema.index({
    "activePlans.courseId": 1,
    "activePlans.billingPeriodStart": 1,
    "activePlans.billingPeriodEnd": 1,
});

export const StudentProfile: Model<StudentProfileDoc> = models.StudentProfile || model<StudentProfileDoc>("StudentProfile", StudentProfileSchema)
