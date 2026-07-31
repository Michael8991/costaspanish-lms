import { Types } from "mongoose";

import type { CourseMemberDTO } from "@/lib/dto/course-profile.dto";
import { toStudentPlanListDTO } from "@/lib/dto/student.dto";

export type CourseMemberStatus = "active" | "paused" | "left";
export type CourseMemberBillingMode = "individual_cycle";

export interface CourseMemberBillingInput {
  mode?: CourseMemberBillingMode;
  billingAnchorDay?: number | null;
  billingStartedAt?: Date | string | null;
  nextBillingDate?: Date | string | null;
  firstVoucherId?: Types.ObjectId | string | null;
  lastVoucherId?: Types.ObjectId | string | null;
  notes?: string;
}

export interface CourseMemberInput {
  studentId: Types.ObjectId | string | Record<string, unknown>;
  status?: CourseMemberStatus;
  joinedAt?: Date | string | null;
  leftAt?: Date | string | null;
  billing?: CourseMemberBillingInput | null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function toIdString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return Types.ObjectId.isValid(normalized) ? normalized : null;
  }

  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  const record = toRecord(value);
  if (!record) return null;

  return toIdString(record._id ?? record.id);
}

function toValidDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date(fallback);
}

function toIsoDateOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getFallbackJoinedAt(value?: Date | string | null): Date {
  return toValidDate(value, new Date());
}

function getStudentIdentity(value: unknown) {
  const record = toRecord(value);
  const studentId = toIdString(value);
  const fullName =
    typeof record?.fullName === "string" ? record.fullName.trim() : "";
  const contactEmail =
    typeof record?.contactEmail === "string"
      ? record.contactEmail.trim() || null
      : null;

  return {
    studentId,
    studentName: fullName || "Alumno",
    studentEmail: contactEmail,
  };
}

function isCourseMemberStatus(value: unknown): value is CourseMemberStatus {
  return value === "active" || value === "paused" || value === "left";
}

export function buildCourseMembersFromStudentIds({
  studentIds,
  joinedAt,
}: {
  studentIds: Array<string | Types.ObjectId>;
  joinedAt?: Date | string | null;
}): CourseMemberInput[] {
  const fallbackJoinedAt = getFallbackJoinedAt(joinedAt);
  const uniqueStudentIds = Array.from(
    new Set(
      studentIds.flatMap((studentId) => {
        const normalizedId = toIdString(studentId);
        return normalizedId ? [normalizedId] : [];
      }),
    ),
  );

  return uniqueStudentIds.map((studentId) => {
    const memberJoinedAt = new Date(fallbackJoinedAt);

    return {
      studentId,
      status: "active",
      joinedAt: memberJoinedAt,
      leftAt: null,
      billing: {
        mode: "individual_cycle",
        billingAnchorDay: memberJoinedAt.getUTCDate(),
        billingStartedAt: null,
        nextBillingDate: null,
        firstVoucherId: null,
        lastVoucherId: null,
        notes: "",
      },
    };
  });
}

export function normalizeCourseMembers({
  members,
  legacyStudentIds,
  fallbackJoinedAt,
}: {
  members?: unknown[] | null;
  legacyStudentIds?: unknown[] | null;
  fallbackJoinedAt?: Date | string | null;
}): CourseMemberDTO[] {
  const joinedAtFallback = getFallbackJoinedAt(fallbackJoinedAt);
  const sourceMembers =
    members && members.length > 0
      ? members
      : (legacyStudentIds ?? []).map((studentId) => ({
          studentId,
          status: "active",
          joinedAt: joinedAtFallback,
          leftAt: null,
          billing: {
            mode: "individual_cycle",
            billingAnchorDay: joinedAtFallback.getUTCDate(),
            billingStartedAt: null,
            nextBillingDate: null,
            firstVoucherId: null,
            lastVoucherId: null,
            notes: "",
          },
        }));
  const seenStudentIds = new Set<string>();

  return sourceMembers.flatMap((sourceMember) => {
    const member = toRecord(sourceMember);
    if (!member) return [];

    const identity = getStudentIdentity(member.studentId);
    if (
      !identity.studentId ||
      seenStudentIds.has(identity.studentId)
    ) {
      return [];
    }
    seenStudentIds.add(identity.studentId);

    const joinedAt = toValidDate(member.joinedAt, joinedAtFallback);
    const billing = toRecord(member.billing);
    const studentRecord = toRecord(member.studentId);
    const activePlans = Array.isArray(studentRecord?.activePlans)
      ? studentRecord.activePlans
      : [];
    const lastVoucherId = toIdString(billing?.lastVoucherId);
    const lastVoucherSource = activePlans.find(
      (plan) => toIdString(plan) === lastVoucherId,
    );
    const billingAnchorDay =
      typeof billing?.billingAnchorDay === "number" &&
      Number.isInteger(billing.billingAnchorDay) &&
      billing.billingAnchorDay >= 1 &&
      billing.billingAnchorDay <= 31
        ? billing.billingAnchorDay
        : joinedAt.getUTCDate();

    return [
      {
        studentId: identity.studentId,
        studentName: identity.studentName,
        studentEmail: identity.studentEmail,
        status: isCourseMemberStatus(member.status)
          ? member.status
          : "active",
        joinedAt: joinedAt.toISOString(),
        leftAt: toIsoDateOrNull(member.leftAt),
        billing: {
          mode: "individual_cycle",
          billingAnchorDay,
          billingStartedAt: toIsoDateOrNull(billing?.billingStartedAt),
          nextBillingDate: toIsoDateOrNull(billing?.nextBillingDate),
          firstVoucherId: toIdString(billing?.firstVoucherId),
          lastVoucherId: toIdString(billing?.lastVoucherId),
          notes:
            typeof billing?.notes === "string"
              ? billing.notes.trim()
              : "",
        },
        lastVoucher: lastVoucherSource
          ? toStudentPlanListDTO(lastVoucherSource)
          : null,
      },
    ];
  });
}

export function deriveStudentIdsFromMembers(
  members: readonly unknown[],
): string[] {
  return Array.from(
    new Set(
      members.flatMap((sourceMember) => {
        const member = toRecord(sourceMember);
        const studentId = toIdString(member?.studentId);
        return studentId ? [studentId] : [];
      }),
    ),
  );
}
