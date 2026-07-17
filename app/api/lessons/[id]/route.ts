import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/mongo";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { toLessonDetailDTO } from "@/lib/utils/lesson.mapper";
import Lesson from "@/models/Lesson";
import { Resource } from "@/models/ResourceProfile";
import { z } from "zod";


import { updateLessonSchema } from "@/lib/validators/lesson";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import {  StudentProfile } from "@/models/StudentProfile";

type ProjectedStudent = {
  _id: Types.ObjectId;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  contactName?: string;
  contactEmail?: string;
  email?: string;
};

type RawLessonAttendeeForGet = {
  studentId?: Types.ObjectId | string;
};

type RawLessonBlockForGet = {
  resources?: Array<Types.ObjectId | string>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    await dbConnect();

    const lesson = await Lesson.findById(id).lean();

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 },
      );
    }

    const studentIds = Array.from(
      new Set(
        ((lesson.attendees ?? []) as RawLessonAttendeeForGet[])
          .map((attendee) => attendee.studentId?.toString())
          .filter((studentId): studentId is string => Boolean(studentId)),
      ),
    );

    const students = await StudentProfile.find(
      {
        _id: { $in: studentIds },
      },
      {
        firstName: 1,
        lastName: 1,
        name: 1,
        fullName: 1,
        contactName: 1,
        contactEmail: 1,
        email: 1,
      },
    ).lean<ProjectedStudent[]>();

    function getStudentDisplayName(student: ProjectedStudent) {
      const firstAndLast = [student.firstName, student.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      return (
        student.fullName ||
        student.name ||
        student.contactName ||
        firstAndLast ||
        student.contactEmail ||
        student.email ||
        "Alumno sin nombre"
      );
    }

    const studentMap = new Map(
      students.map((student) => {
        const studentId = student._id.toString();

        return [
          studentId,
          {
            name: getStudentDisplayName(student),
            email: student.contactEmail || student.email,
          },
        ];
      }),
    );

    const resourceIds = Array.from(
      new Set(
        ((lesson.blocks ?? []) as RawLessonBlockForGet[])
          .flatMap((block) => block.resources ?? [])
          .map((resourceId) => resourceId.toString()),
      ),
    );

    const resources = await Resource.find(
      {
        _id: { $in: resourceIds },
        status: { $ne: "deleted" },
      },
      {
        title: 1,
        format: 1,
        fileUrl: 1,
        externalUrl: 1,
        thumbnailUrl: 1,
      },
    ).lean();

    const resourceMap = new Map(
      resources.map((resource) => {
        const resourceId = resource._id.toString();

        const url =
          resource.format === "external_link"
            ? resource.externalUrl
            : resource.fileUrl;

        return [
          resourceId,
          {
            id: resourceId,
            title: resource.title,
            format: resource.format,
            url,
            thumbnailUrl: resource.thumbnailUrl,
          },
        ];
      }),
    );

    const lessonDTO = toLessonDetailDTO(lesson);

    const lessonWithResources = {
      ...lessonDTO,

      attendees: lessonDTO.attendees.map((attendee) => {
        const student = studentMap.get(attendee.studentId);

        return {
          ...attendee,
          studentName: student?.name ?? "Alumno sin nombre",
          studentEmail: student?.email,
        };
      }),

      blocks: lessonDTO.blocks.map((block) => ({
        ...block,
        resourceItems: block.resources
          .map((resourceId) => resourceMap.get(resourceId))
          .filter((resource) => resource !== undefined),
      })),
    };

    return NextResponse.json(
      {
        item: lessonWithResources,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("Error en GET /api/lessons/[id]:", message);

    return NextResponse.json(
      { error: "Error al obtener la lección" },
      { status: 500 },
    );
  }
}



export async function PATCH(
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

    const body = await req.json();

    const parsed = updateLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid lesson update payload",
          issues: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }

    const payload = parsed.data;

    const set: Record<string, unknown> = {};

    if (payload.title !== undefined) {
      set.title = payload.title;
    }

    if (payload.status !== undefined) {
      set.status = payload.status;
    }
    
    if (payload.preparationStatus !== undefined) {
        set.preparationStatus = payload.preparationStatus;
    }

    if (payload.scheduledStart !== undefined) {
      set.scheduledStart = payload.scheduledStart;
      }

    if (payload.scheduledEnd !== undefined) {
      set.scheduledEnd = payload.scheduledEnd;
    }

    if (payload.timezone !== undefined) {
      set.timezone = payload.timezone;
    }

    if (payload.classType !== undefined) {
      set.classType = payload.classType;
    }

    if (payload.attendees !== undefined) {
      set.attendees = payload.attendees;

      const isWholeLessonTrial =
        payload.attendees.length > 0 &&
        payload.attendees.every((attendee) => attendee.isTrial);

      set.isTrial = isWholeLessonTrial;
    }

    if (payload.blocks !== undefined) {
      set.blocks = payload.blocks;
    }

    if (payload.preparationNotes !== undefined) {
      set.preparationNotes = payload.preparationNotes;
    }

    if (payload.teacherNotes !== undefined) {
      set.teacherNotes = payload.teacherNotes;
    }

    if (payload.homeworkAssigned !== undefined) {
      set.homeworkAssigned = payload.homeworkAssigned;
    }

    if (payload.nextLessonFocus !== undefined) {
      set.nextLessonFocus = payload.nextLessonFocus;
    }

    if (payload.integration !== undefined) {
      set.integration = payload.integration;
    }
    if (payload.blocks !== undefined) {
      set.blocks = payload.blocks;
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 },
      );
    }

    set.updatedAt = new Date();

    const filter =
      user.role === "admin"
        ? { _id: new Types.ObjectId(id) }
        : {
            _id: new Types.ObjectId(id),
            teacherId: currentUserObjectId,
          };

    const lesson = await Lesson.findOneAndUpdate(
      filter,
      { $set: set },
      { new: true },
    );

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: toLessonDetailDTO(lesson.toObject()),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en PATCH /api/lessons/[id]:", error);

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

export async function DELETE(
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

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }

    const filter =
      user.role === "admin"
        ? { _id: new Types.ObjectId(id) }
        : {
            _id: new Types.ObjectId(id),
            teacherId: currentUserObjectId,
          };

    const lesson = await Lesson.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "voided",
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: toLessonDetailDTO(lesson.toObject()),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en DELETE /api/lessons/[id]:", error);

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