import { NextRequest, NextResponse } from "next/server";
import mongoose, { QueryFilter, SortOrder, Types } from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { IResource, Resource } from "@/models/ResourceProfile";
import {
  createResourceSchema,
  formatZodIssues,
  resourceListQuerySchema,
} from "@/lib/validators/resource";
import {
  ResourceListSource,
  toPaginatedResponse,
  toResourceDetailDTO,
  toResourceListItemDTO,
} from "@/lib/dto/resource.dto";

type AuthUser = Exclude<Awaited<ReturnType<typeof requireAuth>>, null>;

function getCurrentUserId(user: AuthUser): string {
  //return String(user.id ?? user._id ?? "");
  return String(user.id ?? "");
}

function getCurrentUserObjectId(user: AuthUser): Types.ObjectId | null {
  const rawId = getCurrentUserId(user);

  if (!Types.ObjectId.isValid(rawId)) {
    return null;
  }

  return new Types.ObjectId(rawId);
}

export async function GET(req: NextRequest) {
  try {
    const maybeUser = await requireAuth(req);

    if (!maybeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user: AuthUser = maybeUser;

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    const rawQuery = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsedQuery = resourceListQuerySchema.safeParse(rawQuery);

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: formatZodIssues(parsedQuery.error.issues),
        },
        { status: 400 },
      );
    }

    const {
      search,
      level,
      pedagogicalType,
      format,
      status,
      visibility,
      ownership,
      ownerTeacherId,
      page,
      limit,
    } = parsedQuery.data;

    await dbConnect();

    const finalQuery: QueryFilter<IResource> = {};

    // =========================
    // Filtros funcionales
    // =========================
    if (search) {
      finalQuery.$text = { $search: search };
    }

    if (level) {
      finalQuery.levels = level;
    }

    if (pedagogicalType) {
      finalQuery.pedagogicalType = pedagogicalType;
    }

    if (format) {
      finalQuery.format = format;
    }

    // =========================
    // Ownership / permisos
    // =========================
    if (user.role === "admin") {
      if (ownerTeacherId) {
        finalQuery.ownerTeacherId = new Types.ObjectId(ownerTeacherId);
      } else if (ownership === "mine") {
        finalQuery.ownerTeacherId = currentUserObjectId;
      } else if (ownership === "shared") {
        finalQuery.visibility = "shared";
      }

      // admin sí puede filtrar libremente por status/visibility
      if (status) {
        finalQuery.status = status;
      }

      if (visibility) {
        finalQuery.visibility = visibility;
      }
    } else {
      // teacher
      if (ownership === "mine") {
        finalQuery.ownerTeacherId = currentUserObjectId;

        if (status) {
          finalQuery.status = status;
        }

        if (visibility) {
          finalQuery.visibility = visibility;
        }
      } else if (ownership === "shared") {
        // aquí mandan las reglas de acceso, no los filtros del usuario
        finalQuery.visibility = "shared";
        finalQuery.status = "published";
      } else {
        // ownership === "all"
        finalQuery.$or = [
          { ownerTeacherId: currentUserObjectId },
          { visibility: "shared", status: "published" },
        ];

        if (status) {
          finalQuery.status = status;
        }

        if (visibility) {
          finalQuery.visibility = visibility;
        }
      }
    }

    const skip = (page - 1) * limit;

    const projection = {
      title: 1,
      description: 1,
      status: 1,
      visibility: 1,
      pedagogicalType: 1,
      levels: 1,
      skills: 1,
      deliveryModes: 1,
      lessonStages: 1,
      grammarTopics: 1,
      vocabularyTopics: 1,
      tags: 1,
      estimatedDurationMinutes: 1,
      difficulty: 1,
      hasAnswerKey: 1,
      requiresTeacherReview: 1,
      format: 1,
      originalFilename: 1,
      mimeType: 1,
      pageCount: 1,
      durationSeconds: 1,
      thumbnailUrl: 1,
      externalUrl: 1,
      timesUsed: 1,
      ownerTeacherId: 1,
      createdAt: 1,
      updatedAt: 1,
    } as const;

    const findProjection = search
      ? { ...projection, score: { $meta: "textScore" as const } }
      : projection;

    const sort: Record<string, SortOrder | { $meta: "textScore" }> = search
      ? {
          score: { $meta: "textScore" },
          createdAt: -1 as SortOrder,
        }
      : {
          createdAt: -1 as SortOrder,
        };

    const [documents, total] = await Promise.all([
      Resource.find(finalQuery, findProjection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<ResourceListSource[]>(),
      Resource.countDocuments(finalQuery),
    ]);

    const items = documents.map((doc) =>
      toResourceListItemDTO(doc, getCurrentUserId(user)),
    );

    return NextResponse.json(toPaginatedResponse(items, page, limit, total), {
      status: 200,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Error en GET /api/resources:", errorMessage);

    return NextResponse.json(
      { error: "Error al obtener los recursos" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const maybeUser = await requireAuth(req);

    if (!maybeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user: AuthUser = maybeUser;

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const parsedBody = createResourceSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: formatZodIssues(parsedBody.error.issues),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const payload = parsedBody.data;

    const created = await Resource.create({
      title: payload.title,
      description: payload.description,

      status: payload.status,
      visibility: payload.visibility,

      pedagogicalType: payload.pedagogicalType,
      levels: payload.levels,
      skills: payload.skills,
      deliveryModes: payload.deliveryModes,
      lessonStages: payload.lessonStages,

      grammarTopics: payload.grammarTopics,
      vocabularyTopics: payload.vocabularyTopics,
      tags: payload.tags,

      estimatedDurationMinutes: payload.estimatedDurationMinutes,
      difficulty: payload.difficulty,

      hasAnswerKey: payload.hasAnswerKey,
      requiresTeacherReview: payload.requiresTeacherReview,

      format: payload.format,
      storagePath: payload.storagePath,
      fileUrl: payload.fileUrl,
      originalFilename: payload.originalFilename,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.fileSizeBytes,
      pageCount: payload.pageCount,
      durationSeconds: payload.durationSeconds,
      thumbnailUrl: payload.thumbnailUrl,
      externalUrl: payload.externalUrl,

      ownerTeacherId: currentUserObjectId,
    });

    return NextResponse.json(
      {
        item: toResourceDetailDTO(created.toObject(), getCurrentUserId(user)),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Datos de recurso no válidos",
          details: Object.values(error.errors).map((err) => ({
            path: err.path,
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    console.error("Error en POST /api/resources:", errorMessage);

    return NextResponse.json(
      { error: "Error al crear un nuevo recurso" },
      { status: 500 },
    );
  }
}
