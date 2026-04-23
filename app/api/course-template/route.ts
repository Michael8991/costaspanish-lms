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
    console.error("GET /api/course-template error:", error);

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
    console.log("1. BODY", body);

    const parsed = createCourseTemplateSchema.safeParse(body);

    if (!parsed.success) {
      console.log("2. ZOD ERROR", parsed.error.flatten());

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
    console.log("3. PARSED", payload);

    const persistenceInput = toCourseTemplatePersistenceInput(payload);
    console.log("4. PERSISTENCE INPUT", persistenceInput);

    const created = await CourseTemplate.create({
      ownerTeacherId,
      ...persistenceInput,
    });
    console.log("5. CREATED", created);

    const dto = toCourseTemplateDetailDTO(created.toObject());
    console.log("6. DTO", dto);

    return NextResponse.json(
      {
        ok: true,
        data: dto,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/course-template FULL ERROR:", error);

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
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to create course template",
        stack: process.env.NODE_ENV === "development" && error instanceof Error
          ? error.stack
          : undefined,
      },
      { status: 500 }
    );
  }
}