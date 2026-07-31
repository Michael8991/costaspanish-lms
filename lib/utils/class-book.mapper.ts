import type { ClassBookRowDTO } from "@/lib/dto/class-book.dto";
import type {
  LessonAttendanceStatus,
  LessonBlockCompletionStatus,
  LessonClassType,
  LessonCreditSettlement,
  LessonPreparationStatus,
  LessonStatus,
} from "@/lib/types/lesson";
import type { Types } from "mongoose";

export interface ClassBookLessonSource {
  _id: Types.ObjectId;
  courseId?: Types.ObjectId | null;
  title: string;
  status: LessonStatus;
  preparationStatus?: LessonPreparationStatus | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone?: string;
  classType?: LessonClassType | null;
  attendees?: Array<{
    studentId: Types.ObjectId;
    attendanceStatus?: LessonAttendanceStatus | null;
    isTrial?: boolean;
  }>;
  blocks?: Array<{
    actualMinutes?: number;
    completionStatus?: LessonBlockCompletionStatus;
    resources?: unknown[];
  }>;
  creditSettlement?: LessonCreditSettlement | null;
  preparationNotes?: string;
  teacherNotes?: string;
  homeworkAssigned?: string;
  nextLessonFocus?: string;
}

export interface ClassBookStudentSource {
  id: string;
  name: string;
  activePlans: Array<{
    id: string;
    creditsTotal: number | null;
    price: number | null;
    priceTotal: number | null;
    unitCreditPriceSnapshot: number | null;
  }>;
}

export interface ClassBookLedgerSource {
  creditsConsumed: number;
  estimatedRevenue: number;
}

interface ClassBookMapperContext {
  coursesById: ReadonlyMap<string, string>;
  studentsById: ReadonlyMap<string, ClassBookStudentSource>;
  ledgerByLessonId: ReadonlyMap<string, ClassBookLedgerSource[]>;
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getZonedParts(date: Date, timezone: string) {
  if (Number.isNaN(date.getTime())) return { date: null, time: null };
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? null;
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return {
    date: year && month && day ? `${year}-${month}-${day}` : null,
    time: hour && minute ? `${hour}:${minute}` : null,
  };
}

function getVoucherUnitPrice(
  student: ClassBookStudentSource | undefined,
  voucherId: string | null,
): number {
  if (!student || !voucherId) return 0;
  const voucher = student.activePlans.find((plan) => plan.id === voucherId);
  if (!voucher) return 0;
  if (voucher.unitCreditPriceSnapshot !== null) {
    return toSafeNumber(voucher.unitCreditPriceSnapshot);
  }
  const price = voucher.priceTotal ?? voucher.price;
  return price !== null && (voucher.creditsTotal ?? 0) > 0
    ? price / (voucher.creditsTotal ?? 1)
    : 0;
}

function getEconomics(
  lesson: ClassBookLessonSource,
  context: ClassBookMapperContext,
) {
  const lessonId = lesson._id.toString();
  const ledgerItems = context.ledgerByLessonId.get(lessonId) ?? [];
  if (ledgerItems.length > 0) {
    return ledgerItems.reduce(
      (total, item) => ({
        creditsConsumed: total.creditsConsumed + item.creditsConsumed,
        estimatedRevenue: total.estimatedRevenue + item.estimatedRevenue,
      }),
      { creditsConsumed: 0, estimatedRevenue: 0 },
    );
  }

  const settlementItems = lesson.creditSettlement?.items ?? [];
  if (settlementItems.length === 0) {
    return { creditsConsumed: 0, estimatedRevenue: 0 };
  }

  return settlementItems.reduce(
    (total, item) => {
      const creditsConsumed = toSafeNumber(item.creditsConsumed);
      const studentId = item.studentId.toString();
      const voucherId = item.voucherId?.toString() ?? null;
      const unitPrice = getVoucherUnitPrice(
        context.studentsById.get(studentId),
        voucherId,
      );
      return {
        creditsConsumed: total.creditsConsumed + creditsConsumed,
        estimatedRevenue:
          total.estimatedRevenue + creditsConsumed * unitPrice,
      };
    },
    { creditsConsumed: 0, estimatedRevenue: 0 },
  );
}

function getNotesPreview(lesson: ClassBookLessonSource): string {
  const nextLessonFocus = lesson.nextLessonFocus?.trim();
  const source = nextLessonFocus
    ? `Próxima: ${nextLessonFocus}`
    : lesson.teacherNotes?.trim() || lesson.preparationNotes?.trim() || "";
  if (!source) return "—";
  return source.length > 80 ? `${source.slice(0, 77)}...` : source;
}

export function toClassBookRowDTO(
  lesson: ClassBookLessonSource,
  context: ClassBookMapperContext,
): ClassBookRowDTO {
  const timezone = lesson.timezone?.trim() || "Europe/Madrid";
  const start = getZonedParts(new Date(lesson.scheduledStart), timezone);
  const end = getZonedParts(new Date(lesson.scheduledEnd), timezone);
  const attendees = lesson.attendees ?? [];
  const students = attendees.map((attendee) => {
    const studentId = attendee.studentId.toString();
    return {
      studentId,
      name: context.studentsById.get(studentId)?.name ?? "Alumno sin nombre",
      attendanceStatus: attendee.attendanceStatus ?? "pending",
      isTrial: attendee.isTrial ?? false,
    };
  });
  const attendedCount = students.filter(
    (student) => student.attendanceStatus === "attended",
  ).length;
  const blocks = lesson.blocks ?? [];
  const durationMilliseconds =
    new Date(lesson.scheduledEnd).getTime() -
    new Date(lesson.scheduledStart).getTime();
  const plannedMinutes = Number.isFinite(durationMilliseconds)
    ? Math.max(0, Math.round(durationMilliseconds / 60_000))
    : 0;
  const actualMinutes = blocks.reduce(
    (total, block) => total + toSafeNumber(block.actualMinutes),
    0,
  );
  const economics = getEconomics(lesson, context);
  const courseId = lesson.courseId?.toString() ?? null;

  return {
    id: lesson._id.toString(),
    lessonId: lesson._id.toString(),
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    courseId,
    courseName: courseId
      ? (context.coursesById.get(courseId) ?? "Curso sin nombre")
      : "Sin curso",
    lessonTitle: lesson.title,
    status: lesson.status,
    preparationStatus: lesson.preparationStatus ?? null,
    classType: lesson.classType ?? null,
    students,
    studentsLabel:
      students.length > 0
        ? students.map((student) => student.name).join(", ")
        : "Sin alumnos",
    attendanceSummary:
      students.length > 0
        ? `${attendedCount}/${students.length} asistieron`
        : "Sin alumnos",
    plannedMinutes,
    actualMinutes,
    creditsConsumed: economics.creditsConsumed,
    estimatedRevenue: economics.estimatedRevenue,
    blocksCount: blocks.length,
    completedBlocksCount: blocks.filter(
      (block) => block.completionStatus === "completed",
    ).length,
    notesPreview: getNotesPreview(lesson),
    hasHomework: Boolean(lesson.homeworkAssigned?.trim()),
    hasResources: blocks.some((block) => (block.resources?.length ?? 0) > 0),
    source: "lesson",
  };
}
