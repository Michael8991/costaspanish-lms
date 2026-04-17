import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongo";

import { CourseTemplate } from "@/models/CourseTemplate";
import { toCourseTemplateDetailDTO, toCourseTemplateListItemDTO } from "@/lib/utils/course-template.mapper";
import {  createCourseTemplateSchema,} from "@/lib/validators/courseTemplate.validator";

import { buildCourseTemplateListQuery, parseCourseTemplateSort, parsePagination } from "@/lib/server/course-template.query";
import { formatZodError, toCourseTemplatePersistenceInput } from "@/lib/server/course-template.api";

function getSessionUserId(session: unknown): string | null {
  const user = (session as { user?: { id?: string; _id?: string } })?.user;
  return user?.id ?? user?._id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    const ownerTeacherId = getSessionUserId(session);

    if (!ownerTeacherId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const { page, limit, skip } = parsePagination(searchParams);
    const sort = parseCourseTemplateSort(searchParams.get("sort"));

    const query = buildCourseTemplateListQuery({ ownerTeacherId, searchParams })
    
    const [items, total] = await Promise.all([
      CourseTemplate.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseTemplate.countDocuments(query),
    ]);

    return NextResponse.json({
      ok: true,
      data: items.map(toCourseTemplateListItemDTO),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/course-templates error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to fetch course templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    const ownerTeacherId = getSessionUserId(session);

    if (!ownerTeacherId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createCourseTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          details: formatZodError(parsed.error),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const persistenceInput = toCourseTemplatePersistenceInput(payload);

    const created = await CourseTemplate.create({
      ownerTeacherId,
      ...persistenceInput,
    });

    return NextResponse.json(
      {
        ok: true,
        data: toCourseTemplateDetailDTO(created.toObject()),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/course-templates error:", error);

    const maybeMongoError = error as { code?: number };

    if (maybeMongoError?.code === 11000) {
      return NextResponse.json(
        {
          ok: false,
          error: "A course template with this code already exists for this teacher",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create course template" },
      { status: 500 }
    );
  }
}