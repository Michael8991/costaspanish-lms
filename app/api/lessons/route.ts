import { requireAuth, requireRole } from '@/lib/auth/apiAuth';
import { getStudentOwnershipFilter } from '@/lib/auth/studentOwnership';
import dbConnect from '@/lib/mongo';
import { getLessonDateRange } from '@/lib/utils/lesson-date-range';
import { normalizeCourseMembers } from '@/lib/utils/course-members';
import { normalizeCourseOperationalPolicies } from '@/lib/utils/course-policies';
import { buildLessonPolicySnapshotFromCoursePolicies } from '@/lib/utils/lesson-policy-snapshot';
import {
  generateWeeklyRecurringLessonDates,
  includeBaseLessonOccurrence,
} from '@/lib/utils/lesson-recurrence';
import {
  buildLessonTitle,
  type LessonTitleStudentInput,
} from '@/lib/utils/lesson-title';
import { toLessonDetailDTO, toLessonListDTO } from '@/lib/utils/lesson.mapper';
import { isoToDatetimeLocalValue, zonedDateTimeToISOString } from '@/lib/utils/time-zone';
import { getCurrentLessonNumber, isPlanCompatible } from '@/lib/utils/lesson-voucher';
import { createLessonSchema } from '@/lib/validators/lesson';
import Lesson from '@/models/Lesson';
import { CourseProfile } from '@/models/CourseProfile';
import { StudentProfile } from '@/models/StudentProfile';
import { Types } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

function getCurrentUserId(user: { id?: string; _id?: string }) {
  return String(user.id ?? user._id ?? "");
}

type LessonListScope = "upcoming" | "history" | "all";

type LessonListFilter = {
  teacherId: string;
  courseId?: Types.ObjectId;
  scheduledStart?: {
    $gte?: Date;
    $lt?: Date;
  };
  scheduledEnd?: {
    $gt?: Date;
  };
  status?: {
    $in: string[];
  };
  $or?: Array<{
    status?: { $in: string[] };
    scheduledStart?: { $lt: Date };
  }>;
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const rawView = searchParams.get("view");
    const view =
      rawView === "day" || rawView === "week" || rawView === "month"
        ? rawView
        : "week";
    const rawDate = searchParams.get("date");
    const rawStart = searchParams.get("start");
    const rawEnd = searchParams.get("end");
    const rawCourseId = searchParams.get("courseId");
    const rawScope = searchParams.get("scope");
    const scope =
      rawScope === "upcoming" ||
      rawScope === "history" ||
      rawScope === "all"
        ? (rawScope as LessonListScope)
        : undefined;
    const date = rawDate ? new Date(rawDate) : new Date();
    const explicitStart = rawStart ? new Date(rawStart) : null;
    const explicitEnd = rawEnd ? new Date(rawEnd) : null;

    if (rawScope && !scope) {
      return NextResponse.json(
        { error: "Invalid scope parameter" },
        { status: 400 },
      );
    }

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date parameter" },
        { status: 400 },
      );
    }

    if (
      Boolean(rawStart) !== Boolean(rawEnd) ||
      (explicitStart && Number.isNaN(explicitStart.getTime())) ||
      (explicitEnd && Number.isNaN(explicitEnd.getTime())) ||
      (explicitStart && explicitEnd && explicitStart >= explicitEnd)
    ) {
      return NextResponse.json(
        { error: "Invalid start/end range parameters" },
        { status: 400 },
      );
    }

    if (rawCourseId && !Types.ObjectId.isValid(rawCourseId)) {
      return NextResponse.json(
        { error: "Invalid courseId parameter" },
        { status: 400 },
      );
    }

    const fallbackRange = getLessonDateRange({ view, date });
    const start = explicitStart ?? fallbackRange.start;
    const end = explicitEnd ?? fallbackRange.end;
    const filter: LessonListFilter = {
      teacherId: getCurrentUserId(user),
    };

    if (!scope) {
      if (explicitStart && explicitEnd) {
        filter.scheduledStart = { $lt: end };
        filter.scheduledEnd = { $gt: start };
      } else {
        filter.scheduledStart = { $gte: start, $lt: end };
      }
    } else if (scope === "upcoming") {
      const upcomingMargin = new Date(Date.now() - 2 * 60 * 60 * 1000);
      filter.scheduledStart = { $gte: upcomingMargin };
      filter.status = { $in: ["scheduled", "in_progress"] };
    } else if (scope === "history") {
      filter.$or = [
        {
          status: {
            $in: ["completed", "canceled_by_teacher", "voided"],
          },
        },
        { scheduledStart: { $lt: new Date() } },
      ];
    }

    if (rawCourseId) {
      filter.courseId = new Types.ObjectId(rawCourseId);
    }

    await dbConnect();

    const sortDirection = !scope || scope === "upcoming" ? 1 : -1;
    const items = await Lesson.find(filter)
      .populate({ path: "courseId", select: "name internalName classType" })
      .sort({ scheduledStart: sortDirection })
      .lean()
      .limit(300);

    return NextResponse.json({
      ok: true,
      view,
      scope: scope ?? null,
      range: { start: start.toISOString(), end: end.toISOString() },
      items: items.map(toLessonListDTO),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("Error GET /api/lessons:", error);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await req.json();

    const parsed = createLessonSchema.safeParse(body);

    if (!parsed.success) {
      const recurrenceIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === "recurrence",
      );

      return NextResponse.json(
        {
          ok: false,
          error: recurrenceIssue?.message ?? "Invalid lesson payload",
          issues: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }

    if (!Types.ObjectId.isValid(currentUserObjectId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const recurrence = payload.recurrence;
    const isCourseMode = payload.creationMode === "course";
    let basePayload;
    let recurringCourseAssociation: Record<string, unknown> = {};

    if (isCourseMode) {
      const courseFilter =
        user.role === "admin"
          ? {
              _id: new Types.ObjectId(payload.courseId),
              status: { $ne: "archived" },
            }
          : {
              _id: new Types.ObjectId(payload.courseId),
              ownerTeacherId: new Types.ObjectId(currentUserObjectId),
              status: { $ne: "archived" },
            };
      const course = await CourseProfile.findOne(courseFilter).lean();

      if (!course) {
        return NextResponse.json(
          { ok: false, error: "Course not found or unavailable" },
          { status: 404 },
        );
      }

      const activeMembers = normalizeCourseMembers({
        members: course.members,
        legacyStudentIds: course.studentIds,
        fallbackJoinedAt: course.startDate ?? course.createdAt,
      }).filter((member) => member.status === "active");

      if (activeMembers.length === 0) {
        return NextResponse.json(
          { ok: false, error: "This course has no active members" },
          { status: 400 },
        );
      }

      const policies = normalizeCourseOperationalPolicies(course.policies);
      const classType =
        course.classType ?? policies.lessonDefaults.defaultClassType;
      const timezone =
        payload.timezone?.trim() ||
        policies.lessonDefaults.timezone ||
        "Europe/Madrid";
      const scheduledEnd =
        payload.scheduledEnd ??
        new Date(
          payload.scheduledStart.getTime() +
            policies.lessonDefaults.durationMinutes * 60_000,
        );

      if (scheduledEnd <= payload.scheduledStart) {
        return NextResponse.json(
          { ok: false, error: "scheduledEnd must be after scheduledStart" },
          { status: 400 },
        );
      }

      const courseName =
        course.name?.trim() || course.internalName.trim() || "Curso";
      const linkedAt = new Date();
      const durationMinutes = Math.max(
        1,
        Math.round(
          (scheduledEnd.getTime() - payload.scheduledStart.getTime()) / 60_000,
        ),
      );

      basePayload = {
        courseId: course._id,
        courseTemplateId: course.templateId,
        courseTemplateVersion: course.templateVersion,
        courseLink: {
          relationType: "course_free_lesson" as const,
          linkedAt,
          linkedBy: new Types.ObjectId(currentUserObjectId),
          notes: "",
        },
        policySnapshot: buildLessonPolicySnapshotFromCoursePolicies({
          policies,
          durationMinutes,
          timezone,
          classType,
        }),
        title: payload.title?.trim() || `${courseName} · Clase`,
        status: payload.status,
        preparationStatus:
          policies.preparationPolicy.defaultPreparationStatus,
        scheduledStart: payload.scheduledStart,
        scheduledEnd,
        timezone,
        classType,
        isTrial: false,
        attendees: activeMembers.map((member) => ({
          studentId: member.studentId,
          voucherId: undefined,
          attendanceStatus: "pending" as const,
          creditsToConsume: policies.creditPolicy.creditsPerLesson,
          isTrial: false,
        })),
        blocks: payload.blocks,
        preparationNotes: payload.preparationNotes,
        teacherNotes: payload.teacherNotes,
        homeworkAssigned: payload.homeworkAssigned,
        nextLessonFocus: payload.nextLessonFocus,
        creationSource: payload.creationSource,
        integration: payload.integration,
      };
      recurringCourseAssociation = {
        courseTemplateId: course.templateId,
        courseTemplateVersion: course.templateVersion,
        courseLink: basePayload.courseLink,
        policySnapshot: basePayload.policySnapshot,
      };
    } else {
      const {
        creationMode: ignoredCreationMode,
        recurrence: ignoredRecurrence,
        courseTemplateId: ignoredCourseTemplateId,
        courseTemplateVersion: ignoredCourseTemplateVersion,
        courseLink: ignoredCourseLink,
        policySnapshot: ignoredPolicySnapshot,
        ...freeBasePayload
      } = payload;
      void ignoredCreationMode;
      void ignoredRecurrence;
      void ignoredCourseTemplateId;
      void ignoredCourseTemplateVersion;
      void ignoredCourseLink;
      void ignoredPolicySnapshot;
      basePayload = freeBasePayload;
    }

    const normalizedBlocks = basePayload.blocks.map((block, index) => ({
      ...block,
      order: block.order ?? index,
    }));

    const isWholeLessonTrial =
      basePayload.attendees.length > 0 &&
      basePayload.attendees.every((attendee) => attendee.isTrial);

    const attendeeStudentIds = Array.from(
      new Set(
        basePayload.attendees.map((attendee) => attendee.studentId.toString()),
      ),
    );
    const studentFilter = getStudentOwnershipFilter(user, {
      _id: {
        $in: attendeeStudentIds.map((studentId) => new Types.ObjectId(studentId)),
      },
    });
    if (!studentFilter) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }
    const studentProfiles = await StudentProfile.find(studentFilter)
      .select("fullName contactEmail activePlans")
      .lean();
    if (studentProfiles.length !== attendeeStudentIds.length) {
      return NextResponse.json(
        { ok: false, error: "Some students are invalid or not accessible" },
        { status: 400 },
      );
    }
    const titleStudents: LessonTitleStudentInput[] = studentProfiles.map(
      (student) => ({
        _id: String(student._id),
        fullName: student.fullName,
        contactEmail: student.contactEmail,
        activePlans: student.activePlans.map((plan) => ({
          _id: String(plan._id),
          classType: plan.classType,
          creditsRemaining: plan.creditsRemaining,
          creditsTotal: plan.creditsTotal,
          status: plan.status,
          validUntil: plan.validUntil,
        })),
      }),
    );
    const titleStudentsById = new Map(
      titleStudents.map((student) => [student._id, student]),
    );

    if (!isCourseMode) {
      for (const attendee of basePayload.attendees) {
        if (attendee.isTrial) continue;

        const selectedPlan = titleStudentsById
          .get(attendee.studentId)
          ?.activePlans?.find((plan) => plan._id === attendee.voucherId);

        if (
          !selectedPlan ||
          !isPlanCompatible(selectedPlan, basePayload.classType)
        ) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "El alumno necesita un bono activo compatible o marcarse como clase de prueba.",
            },
            { status: 400 },
          );
        }
      }
    }

    const selectedProgressPlan = isCourseMode
      ? undefined
      : basePayload.attendees
      .filter((attendee) => !attendee.isTrial && attendee.voucherId)
      .map((attendee) =>
        titleStudentsById
          .get(attendee.studentId)
          ?.activePlans?.find((plan) => plan._id === attendee.voucherId),
      )
      .find((plan) => plan !== undefined);
    const baseLessonNumber = selectedProgressPlan
      ? getCurrentLessonNumber(selectedProgressPlan)
      : undefined;
    const baseStartLocal = isoToDatetimeLocalValue(
      basePayload.scheduledStart.toISOString(),
      basePayload.timezone,
    );
    const baseEndLocal = isoToDatetimeLocalValue(
      basePayload.scheduledEnd.toISOString(),
      basePayload.timezone,
    );

    if (
      recurrence?.enabled &&
      recurrence.endsOn &&
      recurrence.endsOn < baseStartLocal.slice(0, 10)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "La fecha final no puede ser anterior a la clase actual.",
        },
        { status: 400 },
      );
    }

    const localOccurrences = recurrence?.enabled
      ? includeBaseLessonOccurrence(
          generateWeeklyRecurringLessonDates({
            scheduledStart: baseStartLocal,
            scheduledEnd: baseEndLocal,
            daysOfWeek: recurrence.daysOfWeek,
            endsOn: recurrence.endsOn ?? "",
          }),
          baseStartLocal,
          baseEndLocal,
        )
      : [
          {
            scheduledStart: baseStartLocal,
            scheduledEnd: baseEndLocal,
            weekday: undefined,
          },
        ];
    const occurrenceData = localOccurrences.map((occurrence, index) => ({
      scheduledStart: new Date(
        zonedDateTimeToISOString(
          occurrence.scheduledStart,
          basePayload.timezone,
        ),
      ),
      scheduledEnd: new Date(
        zonedDateTimeToISOString(
          occurrence.scheduledEnd,
          basePayload.timezone,
        ),
      ),
      title: isCourseMode
        ? basePayload.title
        : buildLessonTitle({
            attendees: basePayload.attendees,
            students: titleStudents,
            classType: basePayload.classType,
            scheduledStart: occurrence.scheduledStart,
            progressOverride:
              baseLessonNumber !== undefined &&
              selectedProgressPlan?.creditsTotal !== undefined
                ? {
                    currentLessonNumber: baseLessonNumber + index,
                    creditsTotal: selectedProgressPlan.creditsTotal,
                  }
                : undefined,
          }),
    }));
    const currentOccurrence =
      occurrenceData.find(
        (occurrence) =>
          occurrence.scheduledStart.getTime() ===
          basePayload.scheduledStart.getTime(),
      ) ?? occurrenceData[0];

    if (!currentOccurrence) {
      return NextResponse.json(
        { ok: false, error: "No se pudo generar la clase actual." },
        { status: 400 },
      );
    }

    const currentLessonData = {
      ...basePayload,
      blocks: normalizedBlocks,
      title: basePayload.title,
      teacherId: currentUserObjectId,
      isTrial: isWholeLessonTrial,
    };
    const futureLessonData = occurrenceData
      .filter(
        (occurrence) =>
          occurrence.scheduledStart.getTime() !==
          basePayload.scheduledStart.getTime(),
      )
      .map((occurrence) => ({
        teacherId: currentUserObjectId,
        courseId: basePayload.courseId,
        ...recurringCourseAssociation,
        title: occurrence.title,
        status: "scheduled" as const,
        preparationStatus: basePayload.preparationStatus,
        scheduledStart: occurrence.scheduledStart,
        scheduledEnd: occurrence.scheduledEnd,
        timezone: basePayload.timezone,
        classType: basePayload.classType,
        isTrial: isWholeLessonTrial,
        attendees: basePayload.attendees.map((attendee) => ({
          studentId: attendee.studentId,
          voucherId: attendee.voucherId,
          attendanceStatus: "pending" as const,
          creditsToConsume: attendee.isTrial ? 0 : attendee.creditsToConsume,
          isTrial: attendee.isTrial,
        })),
        blocks: [],
        preparationNotes: "",
        homeworkAssigned: "",
        nextLessonFocus: "",
        creationSource: "manual" as const,
        integration: { provider: "manual" as const },
      }));

    const createdLessons = recurrence?.enabled
      ? await Lesson.insertMany([currentLessonData, ...futureLessonData])
      : [await Lesson.create(currentLessonData)];
    const [lesson, ...futureLessons] = createdLessons;

    if (!lesson) {
      throw new Error("Lesson creation returned no document");
    }

    return NextResponse.json(
      {
        ok: true,
        item: toLessonDetailDTO(lesson.toObject()),
        recurrence: recurrence?.enabled
          ? {
              createdCount: futureLessons.length,
              lessons: futureLessons.map((futureLesson) =>
                toLessonListDTO(futureLesson.toObject()),
              ),
            }
          : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error en POST /api/lessons: ", error);

    if (
      error instanceof Error &&
      error.message === "The selected time does not exist in this time zone"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Una de las fechas recurrentes no existe en la zona horaria seleccionada.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
