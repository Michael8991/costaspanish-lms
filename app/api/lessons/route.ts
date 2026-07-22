import { requireAuth, requireRole } from '@/lib/auth/apiAuth';
import dbConnect from '@/lib/mongo';
import { getLessonDateRange } from '@/lib/utils/lesson-date-range';
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
import { StudentProfile } from '@/models/StudentProfile';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

function getCurrentUserId(user: { id?: string; _id?: string }) {
  return String(user.id ?? user._id ?? "");
}

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorizez" },
                {status:401}
            )
        }
        if (!requireRole(user,["admin","teacher"])) {
            return NextResponse.json({ ok: false, error: "Forbidden" },
                {status:403}
            )
        }
       
        const searchParams = req.nextUrl.searchParams;

        const rawView = searchParams.get("view");
        const view = rawView === "day" || rawView === "week" || rawView === "month" ? rawView : "week";

        const rawDate = searchParams.get("date");

        const date = rawDate ? new Date(rawDate) : new Date();

        if (Number.isNaN(date.getTime())) {
            return NextResponse.json(
                { error: "Invalid date parameter" },
                { status: 400 },
            )
        }

        const { start, end } = getLessonDateRange({ view, date });

        const filter = {
            teacherId: getCurrentUserId(user),
            scheduledStart: {
                $gte: start,
                $lt: end
            }
        }

        await dbConnect();

        const items = await Lesson.find(filter).sort({ scheduledStart: 1 }).lean().limit(300);
        
        return NextResponse.json({ ok: true, view, range:{start: start.toISOString(), end: end.toISOString()}, items: items.map(toLessonListDTO)})

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

    const payload = parsed.data;
    const { recurrence, ...basePayload } = payload;

    const isWholeLessonTrial =
      basePayload.attendees.length > 0 &&
      basePayload.attendees.every((attendee) => attendee.isTrial);

    const studentProfiles = await StudentProfile.find({
      _id: {
        $in: basePayload.attendees.map((attendee) => attendee.studentId),
      },
    })
      .select("fullName contactEmail activePlans")
      .lean();
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

    const selectedProgressPlan = basePayload.attendees
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
      title: buildLessonTitle({
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
      title: currentOccurrence.title,
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
        title: occurrence.title,
        status: "scheduled" as const,
        preparationStatus: "needs_preparation" as const,
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
