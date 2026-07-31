
export type DBPlanBillingType = "single" | "package" | "subscription";
export type DBClassType = "private" | "pair" | "group_regular" | "semi_intensive" | "intensive";
export type DBPlanStatus = "active" | "exhausted" | "expired" | "canceled";
export type DBPlanPaymentStatus = "pending" | "paid" | "partial" | "waived";
export type DBVoucherPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "bizum"
  | "card"
  | "other"
  | "";
export type DBVoucherCreatedFrom =
  | "manual"
  | "course_profile"
  | "migration"
  | "legacy";
export type DBAcademicLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Evaluando";



export interface DBPlanDoc { 
        _id?: string;
    name: string;
    billingType: DBPlanBillingType;
    classType: DBClassType;
    creditsTotal?: number;
    creditsRemaining?: number;
    validFrom: Date;
    validUntil?: Date;
    status?: DBPlanStatus | "cancelled" | "archived" | "deleted";
    price?: number;
    courseId?: string;
    courseNameSnapshot?: string;
    billingPeriodStart?: Date;
    billingPeriodEnd?: Date;
    billingMode?: "individual_cycle";
    billingAnchorDay?: number;
    generatedFromCourse?: boolean;
    generatedFromCourseMember?: boolean;
    paymentStatus?: DBPlanPaymentStatus;
    amountPaid?: number;
    paidAt?: Date | null;
    paymentMethod?: DBVoucherPaymentMethod;
    paymentNotes?: string;
    internalNotes?: string;
    priceTotal?: number;
    currency?: "EUR";
    unitCreditPriceSnapshot?: number | null;
    createdFrom?: DBVoucherCreatedFrom;
    notes?: string;
}

export interface DBStudent {
    _id: string;
    teacherId?: string | null;
    userId?: string;
    contactEmail: string;
    contactEmailLower: string;
    fullName: string;
    phone?: string;

    country?: string;
    nativeLanguage?: string;
    timezone: string;
    level: DBAcademicLevel;
    goals: string[];

    internalNotes?: string;

    activePlans: DBPlanDoc[];

    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
  
}


export interface TableStudent {
  id: string;
  name: string;
  email: string;
  level: string;
  status: "active" | "exhausted";
  planType: string;
  creditsRemaining: number;
}
