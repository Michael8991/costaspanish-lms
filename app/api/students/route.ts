import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
    StudentProfile,
} from "@/models/StudentProfile";
import type {
    AcademicLevel,
    ClassType,
    PlanBillingType,
    PlanStatus,
    StudentProfileDoc,
} from "@/models/StudentProfile";
import { NextRequest, NextResponse } from "next/server";
import mongoose, { QueryFilter, Types } from "mongoose";
import {
    toStudentListDTO,
} from "@/lib/dto/student.dto";
import type {
    StudentListResponse,
    StudentListSource,
    StudentListSummary,
} from "@/lib/dto/student.dto";

export async function POST(req: NextRequest){
    const user = await requireAuth(req);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!Types.ObjectId.isValid(user.id)) {
        return NextResponse.json(
            { error: "Authenticated user id is not a valid ObjectId" },
            { status: 500 },
        );
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    
    const { fullName,contactEmail, email, name, billingType, classType, validUntil, price } = body; 

    const rawEmail = (typeof contactEmail === "string" ? contactEmail : typeof email === "string" ? email : "").trim();
    const contactEmailLower = rawEmail.toLowerCase();

   if (price === undefined || isNaN(Number(price))) {
        return NextResponse.json({error: "Price is required and must be a valid number"}, {status: 400});
    }
    
    if (!fullName) {
        return NextResponse.json({error: "Full name is required"}, {status: 400})
    }
    if (!rawEmail) return NextResponse.json({ error: "Contact email is required" }, { status: 400 });
    if (!name) {
        return NextResponse.json({error: "Plan name is required"}, {status: 400})
    }
    if (!billingType) {
        return NextResponse.json({error: "Billing type is required"}, {status: 400})
    }
    if (!classType) {
        return NextResponse.json({error: "Class type is required"}, {status: 400})
    }
    if (!validUntil) {
        return NextResponse.json({error: "Valid until is required"}, {status: 400})
    }

    const creditsTotal = Number(body.creditsTotal ?? 0);
    const creditsRemaining = Number(
        body.creditsRemaining ?? body.creditsTotal ?? 0,
    );
    const validUntilDate = new Date(validUntil);
    const planStatus: PlanStatus =
        creditsRemaining <= 0
            ? "exhausted"
            : validUntilDate < new Date()
              ? "expired"
              : "active";

    await dbConnect();

    try {
        const newStudent = await StudentProfile.create({
            teacherId: new Types.ObjectId(user.id),
            contactEmail: rawEmail,
            contactEmailLower,
            fullName: body.fullName,
            phone: body.phone,
            country: body.country,
            timezone: body.timezone,
            level: body.level,
            nativeLanguage: body.nativeLanguage,
            goals: body.goals,
            internalNotes: body.internalNotes,

            activePlans: [
                {
                    name: name,
                    billingType: billingType,
                    classType: classType,
                    validUntil: validUntilDate,
                    creditsTotal,
                    creditsRemaining,
                    status: planStatus,
                    price: price,
                }
            ]
        });

        return NextResponse.json(
            { message: "Alumno creado con éxito", student: newStudent },
            { status: 201 }
        );

    } catch (error: unknown) { 
        // Le decimos a TypeScript qué forma ESPERAMOS que tenga el error para que no se queje.
        const mongoError = error as { code?: number; message?: string };

        if (mongoError.code === 11000) {
            return NextResponse.json(
                { error: "Ya existe un alumno con este email." },
                { status: 400 }
            );
        }

        console.error("Error creando alumno:", mongoError.message || error);
        return NextResponse.json(
            { error: "Error interno del servidor al crear el alumno." },
            { status: 500 }
        );
    }
}

type AuthUser = Exclude<Awaited<ReturnType<typeof requireAuth>>, null>;
type StudentMongoFilter = Record<string, unknown>;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

const ACADEMIC_LEVELS = [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
] as const satisfies readonly AcademicLevel[];
const PLAN_BILLING_TYPES = [
    "single",
    "package",
    "subscription",
] as const satisfies readonly PlanBillingType[];
const CLASS_TYPES = [
    "private",
    "pair",
    "group_regular",
    "semi_intensive",
    "intensive",
] as const satisfies readonly ClassType[];
const PLAN_STATUSES = [
    "active",
    "exhausted",
    "expired",
    "canceled",
] as const satisfies readonly PlanStatus[];
const STUDENT_STATUSES = ["active", "inactive"] as const;
const PLAN_HEALTH_VALUES = [
    "expiring_soon",
    "low_credits",
    "no_active_plan",
] as const;
const LOW_REMAINING_RATIO = 0.25;

function parsePositiveInteger(
    value: string | null,
    fallback: number,
    maximum = Number.MAX_SAFE_INTEGER,
): number {
    if (value === null || value.trim() === "") {
        return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readEnumParam<T extends string>(
    value: string | null,
    allowedValues: readonly T[],
): T | undefined | null {
    const normalized = value?.trim();

    if (!normalized || normalized === "all") {
        return undefined;
    }

    return allowedValues.includes(normalized as T)
        ? (normalized as T)
        : null;
}

function invalidQueryResponse(parameter: string) {
    return NextResponse.json(
        { error: `Invalid ${parameter} query parameter` },
        { status: 400 },
    );
}

function pendingLevelCondition(): StudentMongoFilter {
    return {
        $or: [
            { level: "Evaluando" },
            { level: { $exists: false } },
            { level: null },
            { level: "" },
        ],
    };
}

function noActivePlanCondition(): StudentMongoFilter {
    return {
        activePlans: {
            $not: {
                $elemMatch: { status: "active" },
            },
        },
    };
}

function planRemainingRatioCondition({
    maxRatio = LOW_REMAINING_RATIO,
    classType,
    billingType,
}: {
    maxRatio?: number;
    classType?: ClassType;
    billingType?: PlanBillingType;
} = {}): StudentMongoFilter {
    const planConditions: StudentMongoFilter[] = [
        { $eq: ["$$plan.status", "active"] },
        { $gt: ["$$plan.creditsTotal", 0] },
        { $isNumber: "$$plan.creditsRemaining" },
        {
            $lte: [
                {
                    $divide: [
                        "$$plan.creditsRemaining",
                        {
                            $cond: [
                                { $gt: ["$$plan.creditsTotal", 0] },
                                "$$plan.creditsTotal",
                                1,
                            ],
                        },
                    ],
                },
                maxRatio,
            ],
        },
    ];

    if (classType) {
        planConditions.push({
            $eq: ["$$plan.classType", classType],
        });
    }

    if (billingType) {
        planConditions.push({
            $eq: ["$$plan.billingType", billingType],
        });
    }

    return {
        $expr: {
            $gt: [
                {
                    $size: {
                        $filter: {
                            input: { $ifNull: ["$activePlans", []] },
                            as: "plan",
                            cond: { $and: planConditions },
                        },
                    },
                },
                0,
            ],
        },
    };
}

function asStudentFilter(
    filter: StudentMongoFilter,
): QueryFilter<StudentProfileDoc> {
    return filter as QueryFilter<StudentProfileDoc>;
}

function combineStudentFilters(
    ...conditions: StudentMongoFilter[]
): StudentMongoFilter {
    const validConditions = conditions.filter(
        (condition) => Object.keys(condition).length > 0,
    );

    if (validConditions.length === 0) return {};
    if (validConditions.length === 1) return validConditions[0];

    return { $and: validConditions };
}

function debugStudents(label: string, value: unknown) {
    if (IS_DEVELOPMENT) {
        console.log(`[GET /api/students] ${label}:`, value);
    }
}

async function countSummaryMetric(
    name: string,
    filter: StudentMongoFilter,
): Promise<number> {
    try {
        const count = await StudentProfile.countDocuments(
            asStudentFilter(filter),
        );

        debugStudents(`summary.${name}`, count);
        return count;
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";

        console.error(
            `[GET /api/students] Summary metric "${name}" failed:`,
            message,
        );
        return 0;
    }
}

export async function GET(req: NextRequest) {
    try {
        const maybeUser = await requireAuth(req);

        if (!maybeUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const user: AuthUser = maybeUser;

        debugStudents("user.id", user.id);
        debugStudents("user.role", user.role);

        if (!requireRole(user, ["admin", "teacher"])) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();
        debugStudents(
            "mongoose readyState",
            mongoose.connection.readyState,
        );

        const searchParams = req.nextUrl.searchParams;
        const page = parsePositiveInteger(searchParams.get("page"), 1);
        const limit = parsePositiveInteger(searchParams.get("limit"), 10, 50);
        const skip = (page - 1) * limit;
        const search = (
            searchParams.get("search") ??
            searchParams.get("q") ??
            ""
        ).trim();

        const rawLevel =
            searchParams.get("level") ??
            searchParams.get("academicLevel");
        const level =
            rawLevel?.trim() === "pending" ||
            rawLevel?.trim() === "Evaluando"
                ? "pending"
                : readEnumParam(rawLevel, ACADEMIC_LEVELS);
        const status = readEnumParam(
            searchParams.get("status"),
            STUDENT_STATUSES,
        );
        const planType = readEnumParam(
            searchParams.get("planType"),
            PLAN_BILLING_TYPES,
        );
        const classType = readEnumParam(
            searchParams.get("classType"),
            CLASS_TYPES,
        );
        const planHealth = readEnumParam(
            searchParams.get("planHealth"),
            PLAN_HEALTH_VALUES,
        );
        const legacyPlanStatus = readEnumParam(
            searchParams.get("statusPlan"),
            PLAN_STATUSES,
        );

        debugStudents("parsed query params", {
            page,
            limit,
            search,
            level,
            status,
            planType,
            classType,
            planHealth,
            legacyPlanStatus,
        });

        if (level === null) return invalidQueryResponse("level");
        if (status === null) return invalidQueryResponse("status");
        if (planType === null) return invalidQueryResponse("planType");
        if (classType === null) return invalidQueryResponse("classType");
        if (planHealth === null) return invalidQueryResponse("planHealth");
        if (legacyPlanStatus === null) {
            return invalidQueryResponse("statusPlan");
        }

        // TODO: Re-enable teacher ownership filter after StudentProfile documents
        // are migrated to include teacherId.
        const baseFilter: StudentMongoFilter = {};
        const andConditions: StudentMongoFilter[] = [];

        if (search) {
            const safeSearch = escapeRegExp(search);
            andConditions.push({
                $or: [
                    { fullName: { $regex: safeSearch, $options: "i" } },
                    { contactEmail: { $regex: safeSearch, $options: "i" } },
                    {
                        contactEmailLower: {
                            $regex: safeSearch.toLowerCase(),
                            $options: "i",
                        },
                    },
                    { phone: { $regex: safeSearch, $options: "i" } },
                ],
            });
        }

        if (level === "pending") {
            andConditions.push(pendingLevelCondition());
        } else if (level) {
            andConditions.push({ level });
        }

        if (status) {
            andConditions.push({ isActive: status === "active" });
        }

        if (planHealth === "no_active_plan") {
            andConditions.push(noActivePlanCondition());
        }

        const usesRemainingRatio =
            planHealth === "low_credits" ||
            planHealth === "expiring_soon";

        if (usesRemainingRatio) {
            andConditions.push(
                planRemainingRatioCondition({
                    classType,
                    billingType: planType,
                }),
            );
        }

        const activePlanMatch: Record<string, unknown> = {};
        const shouldMatchActivePlan =
            !usesRemainingRatio &&
            Boolean(planType || classType || legacyPlanStatus);

        if (shouldMatchActivePlan) {
            activePlanMatch.status = legacyPlanStatus ?? "active";
        }

        if (planType) {
            activePlanMatch.billingType = planType;
        }

        if (classType) {
            activePlanMatch.classType = classType;
        }

        if (shouldMatchActivePlan) {
            andConditions.push({
                activePlans: { $elemMatch: activePlanMatch },
            });
        }

        const filter = combineStudentFilters(
            baseFilter,
            ...andConditions,
        );

        debugStudents("final Mongo filter", filter);

        const expiringSoonCondition = planRemainingRatioCondition();
        const projection = {
            teacherId: 1,
            userId: 1,
            contactEmail: 1,
            fullName: 1,
            phone: 1,
            level: 1,
            activePlans: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1,
        } as const;

        const [documents, total] = await Promise.all([
            StudentProfile.find(asStudentFilter(filter), projection)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean<StudentListSource[]>(),
            StudentProfile.countDocuments(asStudentFilter(filter)),
        ]);

        debugStudents("total", total);
        debugStudents("documents.length", documents.length);
        debugStudents("first document before mapper", documents[0] ?? null);

        const items = documents.map(toStudentListDTO);

        debugStudents("first item after mapper", items[0] ?? null);

        const summary: StudentListSummary = {
            activeStudents: 0,
            expiringPlansSoon: 0,
            pendingLevel: 0,
            studentsWithoutActivePlan: 0,
        };

        summary.activeStudents = await countSummaryMetric(
            "activeStudents",
            combineStudentFilters(baseFilter, { isActive: true }),
        );
        summary.expiringPlansSoon = await countSummaryMetric(
            "expiringPlansSoon",
            combineStudentFilters(baseFilter, expiringSoonCondition),
        );
        summary.pendingLevel = await countSummaryMetric(
            "pendingLevel",
            combineStudentFilters(baseFilter, pendingLevelCondition()),
        );
        summary.studentsWithoutActivePlan = await countSummaryMetric(
            "studentsWithoutActivePlan",
            combineStudentFilters(baseFilter, noActivePlanCondition()),
        );

        const totalPages = Math.max(1, Math.ceil(total / limit));
        const response: StudentListResponse = {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
            summary,
            page,
            limit,
            total,
        };

        return NextResponse.json(response);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";

        console.error("Error in GET /api/students:", error);

        return NextResponse.json(
            {
                error: "Error al obtener los estudiantes",
                details: message,
            },
            { status: 500 },
        );
    }
}
