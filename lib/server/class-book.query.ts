import type {
  ClassBookResponseDTO,
  ClassBookRowDTO,
} from "@/lib/dto/class-book.dto";
import type { Role } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  type ClassBookLedgerSource,
  type ClassBookLessonSource,
  type ClassBookStudentSource,
  toClassBookRowDTO,
} from "@/lib/utils/class-book.mapper";
import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";
import { CreditLedgerEntry } from "@/models/CreditLedgerEntry";
import { CourseProfile } from "@/models/CourseProfile";
import Lesson from "@/models/Lesson";
import { StudentProfile } from "@/models/StudentProfile";
import { Types } from "mongoose";

export class ClassBookQueryError extends Error {}

export interface ClassBookAuthUser {
  id: string;
  role: Role;
}

interface GetClassBookDataArgs {
  user: ClassBookAuthUser;
  month: string;
  courseId?: string;
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface ClassBookCourseQuerySource {
  _id: Types.ObjectId;
  name?: string;
  internalName: string;
}

interface ClassBookStudentQuerySource {
  _id: Types.ObjectId;
  fullName: string;
  activePlans: Array<{
    _id: Types.ObjectId;
    creditsTotal?: number;
    price?: number;
    priceTotal?: number;
    unitCreditPriceSnapshot?: number | null;
  }>;
}

interface ClassBookLedgerQuerySource {
  lessonId: Types.ObjectId;
  creditsConsumed: number;
  estimatedRevenue: number;
}

const classBookStatuses = new Set([
  "scheduled",
  "in_progress",
  "completed",
  "canceled_by_teacher",
  "voided",
]);

const classBookLessonFields = [
  "courseId",
  "title",
  "status",
  "preparationStatus",
  "scheduledStart",
  "scheduledEnd",
  "timezone",
  "classType",
  "attendees.studentId",
  "attendees.attendanceStatus",
  "attendees.isTrial",
  "blocks.actualMinutes",
  "blocks.completionStatus",
  "blocks.resources",
  "creditSettlement",
  "preparationNotes",
  "teacherNotes",
  "homeworkAssigned",
  "nextLessonFocus",
].join(" ");

function parseMonth(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) {
    throw new ClassBookQueryError("month must use YYYY-MM format");
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
  const nextMonthValue = `${nextMonth.getUTCFullYear()}-${String(
    nextMonth.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
  return {
    start: new Date(
      zonedDateTimeToISOString(`${month}-01T00:00:00`, "Europe/Madrid"),
    ),
    end: new Date(
      zonedDateTimeToISOString(
        `${nextMonthValue}-01T00:00:00`,
        "Europe/Madrid",
      ),
    ),
  };
}

export function getCurrentClassBookMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : now.toISOString().slice(0, 7);
}

function parsePagination(page = 1, limit = 50) {
  if (!Number.isInteger(page) || page < 1) {
    throw new ClassBookQueryError("page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ClassBookQueryError("limit must be between 1 and 100");
  }
  return { page, limit, skip: (page - 1) * limit };
}

function parseOptionalObjectId(value: string | undefined, name: string) {
  if (!value) return null;
  if (!Types.ObjectId.isValid(value)) {
    throw new ClassBookQueryError(`Invalid ${name}`);
  }
  return new Types.ObjectId(value);
}

function uniqueObjectIds(values: Array<Types.ObjectId | null | undefined>) {
  return Array.from(
    new Map(
      values
        .filter((value): value is Types.ObjectId => Boolean(value))
        .map((value) => [value.toString(), value]),
    ).values(),
  );
}

function buildSummary(month: string, rows: ClassBookRowDTO[]) {
  const uniqueStudentIds = new Set(
    rows.flatMap((row) => row.students.map((student) => student.studentId)),
  );
  return {
    month,
    totalLessons: rows.length,
    scheduledLessons: rows.filter((row) => row.status === "scheduled").length,
    completedLessons: rows.filter((row) => row.status === "completed").length,
    canceledLessons: rows.filter(
      (row) => row.status === "canceled_by_teacher",
    ).length,
    inProgressLessons: rows.filter((row) => row.status === "in_progress")
      .length,
    totalStudents: uniqueStudentIds.size,
    totalPlannedMinutes: rows.reduce(
      (total, row) => total + row.plannedMinutes,
      0,
    ),
    totalActualMinutes: rows.reduce(
      (total, row) => total + row.actualMinutes,
      0,
    ),
    totalCreditsConsumed: rows.reduce(
      (total, row) => total + row.creditsConsumed,
      0,
    ),
    totalEstimatedRevenue: rows.reduce(
      (total, row) => total + row.estimatedRevenue,
      0,
    ),
  };
}

export async function getClassBookData(
  args: GetClassBookDataArgs,
): Promise<ClassBookResponseDTO> {
  const { start, end } = parseMonth(args.month);
  const pagination = parsePagination(args.page, args.limit);
  const courseId = parseOptionalObjectId(args.courseId, "courseId");
  const studentId = parseOptionalObjectId(args.studentId, "studentId");

  if (args.status && !classBookStatuses.has(args.status)) {
    throw new ClassBookQueryError("Invalid status filter");
  }
  if (args.user.role !== "admin" && !Types.ObjectId.isValid(args.user.id)) {
    throw new ClassBookQueryError("Invalid current user id");
  }

  const lessonFilter: Record<string, unknown> = {
    scheduledStart: { $gte: start, $lt: end },
  };
  const currentUserObjectId = Types.ObjectId.isValid(args.user.id)
    ? new Types.ObjectId(args.user.id)
    : null;
  if (args.user.role !== "admin" && currentUserObjectId) {
    lessonFilter.teacherId = currentUserObjectId;
  }
  if (courseId) lessonFilter.courseId = courseId;
  if (studentId) lessonFilter["attendees.studentId"] = studentId;
  if (args.status) lessonFilter.status = args.status;

  await dbConnect();

  const [pageLessonResults, summaryLessonResults] = await Promise.all([
    Lesson.find(lessonFilter)
      .select(classBookLessonFields)
      .sort({ scheduledStart: 1, _id: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Lesson.find(lessonFilter)
      .select(classBookLessonFields)
      .sort({ scheduledStart: 1, _id: 1 })
      .lean(),
  ]);
  const pageLessons = pageLessonResults as unknown as ClassBookLessonSource[];
  const summaryLessons =
    summaryLessonResults as unknown as ClassBookLessonSource[];
  const lessonIds = summaryLessons.map((lesson) => lesson._id);
  const courseIds = uniqueObjectIds(
    summaryLessons.map((lesson) => lesson.courseId),
  );
  const studentIds = uniqueObjectIds(
    summaryLessons.flatMap((lesson) =>
      (lesson.attendees ?? []).map((attendee) => attendee.studentId),
    ),
  );

  const courseFilter: Record<string, unknown> = { _id: { $in: courseIds } };
  const studentFilter: Record<string, unknown> = {
    _id: { $in: studentIds },
  };
  const ledgerFilter: Record<string, unknown> = {
    lessonId: { $in: lessonIds },
    status: "active",
  };
  if (args.user.role !== "admin" && currentUserObjectId) {
    courseFilter.ownerTeacherId = currentUserObjectId;
    studentFilter.teacherId = currentUserObjectId;
    ledgerFilter.teacherId = currentUserObjectId;
  }

  const [courseResults, studentResults, ledgerResults] = await Promise.all([
    CourseProfile.find(courseFilter).select("name internalName").lean(),
    StudentProfile.find(studentFilter)
      .select(
        "fullName activePlans._id activePlans.creditsTotal activePlans.price activePlans.priceTotal activePlans.unitCreditPriceSnapshot",
      )
      .lean(),
    CreditLedgerEntry.find(ledgerFilter)
      .select("lessonId creditsConsumed estimatedRevenue")
      .lean(),
  ]);
  const courses = courseResults as unknown as ClassBookCourseQuerySource[];
  const students = studentResults as unknown as ClassBookStudentQuerySource[];
  const ledgerEntries =
    ledgerResults as unknown as ClassBookLedgerQuerySource[];

  const coursesById = new Map(
    courses.map((course) => [
      course._id.toString(),
      course.name?.trim() || course.internalName,
    ]),
  );
  const studentsById = new Map<string, ClassBookStudentSource>(
    students.map((student) => [
      student._id.toString(),
      {
        id: student._id.toString(),
        name: student.fullName,
        activePlans: (student.activePlans ?? []).map((plan) => ({
          id: plan._id.toString(),
          creditsTotal: plan.creditsTotal ?? null,
          price: plan.price ?? null,
          priceTotal: plan.priceTotal ?? null,
          unitCreditPriceSnapshot: plan.unitCreditPriceSnapshot ?? null,
        })),
      },
    ]),
  );
  const ledgerByLessonId = new Map<string, ClassBookLedgerSource[]>();
  for (const entry of ledgerEntries) {
    const lessonId = entry.lessonId.toString();
    const current = ledgerByLessonId.get(lessonId) ?? [];
    current.push({
      creditsConsumed: entry.creditsConsumed,
      estimatedRevenue: entry.estimatedRevenue,
    });
    ledgerByLessonId.set(lessonId, current);
  }

  const mapperContext = { coursesById, studentsById, ledgerByLessonId };
  const rows = pageLessons.map((lesson) =>
    toClassBookRowDTO(lesson, mapperContext),
  );
  const summaryRows = summaryLessons.map((lesson) =>
    toClassBookRowDTO(lesson, mapperContext),
  );
  const total = summaryRows.length;

  return {
    month: args.month,
    filters: {
      courseId: args.courseId ?? null,
      studentId: args.studentId ?? null,
      status: args.status ?? null,
    },
    summary: buildSummary(args.month, summaryRows),
    rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    },
  };
}
