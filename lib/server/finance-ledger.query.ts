import { Types } from "mongoose";

import type { Role } from "@/lib/auth/apiAuth";

export class FinanceLedgerQueryError extends Error {}

export type FinanceLedgerStatusFilter = "active" | "reversed" | "all";

export function parseFinancePagination(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawLimit = Number(searchParams.get("limit") ?? "25");

  if (!Number.isInteger(rawPage) || rawPage < 1) {
    throw new FinanceLedgerQueryError("page must be a positive integer");
  }
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    throw new FinanceLedgerQueryError("limit must be between 1 and 100");
  }

  return {
    page: rawPage,
    limit: rawLimit,
    skip: (rawPage - 1) * rawLimit,
  };
}

export function parseFinanceStatus(
  searchParams: URLSearchParams,
): FinanceLedgerStatusFilter {
  const status = searchParams.get("status") ?? "active";
  if (status === "active" || status === "reversed" || status === "all") {
    return status;
  }
  throw new FinanceLedgerQueryError("Invalid status filter");
}

export function parseOptionalFinanceObjectId(
  searchParams: URLSearchParams,
  key: "teacherId" | "studentId" | "courseId",
): Types.ObjectId | null {
  const value = searchParams.get(key);
  if (!value) return null;
  if (!Types.ObjectId.isValid(value)) {
    throw new FinanceLedgerQueryError(`Invalid ${key}`);
  }
  return new Types.ObjectId(value);
}

export function parseFinanceMonth(month: string | null): {
  month: string;
  start: Date;
  end: Date;
} | null {
  if (!month) return null;
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) {
    throw new FinanceLedgerQueryError("month must use YYYY-MM format");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    month,
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

export function getCurrentUtcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function buildFinanceOwnershipFilter(args: {
  user: { id: string; role: Role };
  searchParams: URLSearchParams;
}): Record<string, unknown> {
  if (args.user.role !== "admin") {
    if (!Types.ObjectId.isValid(args.user.id)) {
      throw new FinanceLedgerQueryError("Invalid current user id");
    }
    return { teacherId: new Types.ObjectId(args.user.id) };
  }

  const teacherId = parseOptionalFinanceObjectId(
    args.searchParams,
    "teacherId",
  );
  return teacherId ? { teacherId } : {};
}

export function buildFinanceBaseFilter(args: {
  user: { id: string; role: Role };
  searchParams: URLSearchParams;
  dateField: "paidAt" | "consumedAt";
}): Record<string, unknown> {
  const filter = buildFinanceOwnershipFilter(args);
  const studentId = parseOptionalFinanceObjectId(
    args.searchParams,
    "studentId",
  );
  const courseId = parseOptionalFinanceObjectId(
    args.searchParams,
    "courseId",
  );
  const month = parseFinanceMonth(args.searchParams.get("month"));

  if (studentId) filter.studentId = studentId;
  if (courseId) filter.courseId = courseId;
  if (month) {
    filter[args.dateField] = { $gte: month.start, $lt: month.end };
  }

  return filter;
}
