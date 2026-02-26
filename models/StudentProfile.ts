import { Model } from "mongoose";
import { model, models, Schema, Types } from "mongoose";

export type PlanBillingType = "single" | "package" | "subscription";
export type ClassType = "private" | "pair" | "group_regular" | "semi_intensive" | "intensive";
export type PlanStatus = "active" | "exhausted" | "expired" | "canceled";
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
}

export interface StudentProfileDoc{
    _id: Types.ObjectId;
    userId?: Types.ObjectId;
    contactEmail: string;
    contactEmailLower: string;
    fullName: string;
    phone?: string;
    country?: string;
    timezone: string;
    level: AcademicLevel;
    nativeLanguage?: string;
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
    status: { type: String, enum: ["active", "exhausted", "expired", "canceled"], default: "active" }
})

const StudentProfileSchema = new Schema<StudentProfileDoc>({
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
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

export const StudentProfile: Model<StudentProfileDoc> = models.StudentProfile || model<StudentProfileDoc>("StudentProfile", StudentProfileSchema) 