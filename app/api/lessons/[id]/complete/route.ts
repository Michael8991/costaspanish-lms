import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import dbConnect from "@/lib/mongo";
import { StudentProfile } from "@/models/StudentProfile";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { toLessonDetailDTO } from "@/lib/utils/lesson.mapper";
import Lesson from "@/models/Lesson";

type AttendanceStatus =
  | "attended"
  | "no_show"
  | "canceled_early"
  | "canceled_late"
  | "pending";

type LessonAttendeeForComplete = {
  studentId: Types.ObjectId | string;
  voucherId?: Types.ObjectId | string;
  attendanceStatus: AttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
};

function toValidObjectId(value?: Types.ObjectId | string | null) {
  if (!value) return null;

  const stringValue = value.toString();

  if (!Types.ObjectId.isValid(stringValue)) {
    return null;
  }

  return new Types.ObjectId(stringValue);
}

function shouldConsumeCredits(status: AttendanceStatus) {
  return ["attended", "no_show", "canceled_late"].includes(status);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    await dbConnect();

    const lessonObjectId = new Types.ObjectId(id);
    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }

    const filter =
      user.role === "admin"
        ? { _id: lessonObjectId }
        : {
            _id: lessonObjectId,
            teacherId: currentUserObjectId,
          };

    const lesson = await Lesson.findOne(filter).lean();

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    if (lesson.status === "completed") {
      return NextResponse.json(
        { ok: false, error: "Lesson is already completed" },
        { status: 409 },
      );
    }

    if (lesson.status === "voided" || lesson.status === "canceled_by_teacher") {
      return NextResponse.json(
        { ok: false, error: "This lesson cannot be completed" },
        { status: 409 },
      );
    }

    const attendees = (lesson.attendees ?? []) as LessonAttendeeForComplete[];

    if (attendees.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Lesson has no attendees" },
        { status: 400 },
      );
    }

    const hasPendingAttendance = attendees.some(
      (attendee) => attendee.attendanceStatus === "pending",
    );

    if (hasPendingAttendance) {
      return NextResponse.json(
        {
          ok: false,
          error: "All attendees must have attendance marked before completing the lesson",
        },
        { status: 400 },
      );
    }

    const consumptions = attendees
      .filter((attendee) => {
        if (attendee.isTrial) return false;
        return shouldConsumeCredits(attendee.attendanceStatus);
      })
      .map((attendee) => {
        const studentObjectId = toValidObjectId(attendee.studentId);
        const voucherObjectId = toValidObjectId(attendee.voucherId);
        const creditsToConsume = attendee.creditsToConsume ?? 1;

        return {
          studentObjectId,
          voucherObjectId,
          creditsToConsume,
        };
      });

    for (const consumption of consumptions) {
      if (!consumption.studentObjectId || !consumption.voucherObjectId) {
        return NextResponse.json(
          {
            ok: false,
            error: "Missing student or voucher for credit consumption",
          },
          { status: 400 },
        );
      }

      if (consumption.creditsToConsume <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "creditsToConsume must be greater than 0",
          },
          { status: 400 },
        );
      }

      const studentWithValidPlan = await StudentProfile.findOne(
        {
          _id: consumption.studentObjectId,
          activePlans: {
            $elemMatch: {
              _id: consumption.voucherObjectId,
              status: "active",
              creditsRemaining: {
                $gte: consumption.creditsToConsume,
              },
            },
          },
        },
        { _id: 1 },
      ).lean();

      if (!studentWithValidPlan) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "One or more students do not have enough active credits to complete this lesson",
          },
          { status: 409 },
        );
      }
    }

    for (const consumption of consumptions) {
      if (!consumption.studentObjectId || !consumption.voucherObjectId) {
        continue;
      }

      await StudentProfile.updateOne(
        {
          _id: consumption.studentObjectId,
          activePlans: {
            $elemMatch: {
              _id: consumption.voucherObjectId,
              status: "active",
              creditsRemaining: {
                $gte: consumption.creditsToConsume,
              },
            },
          },
        },
        {
          $inc: {
            "activePlans.$.creditsRemaining": -consumption.creditsToConsume,
          },
        },
      );

      await StudentProfile.updateOne(
        {
          _id: consumption.studentObjectId,
          activePlans: {
            $elemMatch: {
              _id: consumption.voucherObjectId,
              creditsRemaining: {
                $lte: 0,
              },
            },
          },
        },
        {
          $set: {
            "activePlans.$.status": "exhausted",
          },
        },
      );
    }

    const completedLesson = await Lesson.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "completed",
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!completedLesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found after completion" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        creditsConsumed: consumptions.reduce(
          (total, item) => total + item.creditsToConsume,
          0,
        ),
        item: toLessonDetailDTO(completedLesson.toObject()),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en POST /api/lessons/[id]/complete:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        error: "Internal Server Error",
        message,
      },
      { status: 500 },
    );
  }
}