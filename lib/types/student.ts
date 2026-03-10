
export type DBPlanBillingType = "single" | "package" | "subscription";
export type DBClassType = "private" | "pair" | "group_regular" | "semi_intensive" | "intensive";
export type DBPlanStatus = "active" | "exhausted" | "expired" | "canceled";
export type DBAcademicLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Evaluando";



export interface DBPlanDoc { 
        _id?: string;
    name: string;
    billingType: DBPlanBillingType;
    classType: DBClassType;
    creditsTotal?: number;
    creditsRemaining?: number;
    validFrom: Date;
    validUntil: Date;
    status: DBPlanStatus;
    price: number;
}

export interface DBStudent {
    _id: string;
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