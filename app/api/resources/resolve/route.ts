import { NextRequest, NextResponse } from "next/server";
import { QueryFilter, Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import {
  ResourceListSource,
  toResourceListItemDTO,
} from "@/lib/dto/resource.dto";
import dbConnect from "@/lib/mongo";
import { IResource, Resource } from "@/models/ResourceProfile";

type AuthUser = Exclude<Awaited<ReturnType<typeof requireAuth>>, null>;

const resolveResourcesSchema = z.object({
  ids: z
    .array(z.string().trim().regex(/^[a-f\d]{24}$/i))
    .max(200)
    .transform((ids) => Array.from(new Set(ids))),
});

function getCurrentUserId(user: AuthUser) {
  return String(user.id ?? "");
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

    const body: unknown = await req.json();
    const parsedBody = resolveResourcesSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid resource ids" },
        { status: 400 },
      );
    }

    if (parsedBody.data.ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const currentUserId = getCurrentUserId(user);
    if (!Types.ObjectId.isValid(currentUserId)) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    const resourceIds = parsedBody.data.ids.map((id) => new Types.ObjectId(id));
    const currentUserObjectId = new Types.ObjectId(currentUserId);
    const query: QueryFilter<IResource> = {
      _id: { $in: resourceIds },
      status: { $nin: ["archived", "deleted"] },
    };

    if (user.role !== "admin") {
      query.$or = [
        { ownerTeacherId: currentUserObjectId },
        { visibility: "shared", status: "published" },
      ];
    }

    await dbConnect();

    const documents = await Resource.find(query, {
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
      fileUrl: 1,
      externalUrl: 1,
      timesUsed: 1,
      ownerTeacherId: 1,
      createdAt: 1,
      updatedAt: 1,
      storagePath: 1,
      thumbnailStoragePath: 1,
    }).lean<ResourceListSource[]>();

    const itemsById = new Map(
      documents.map((document) => [
        String(document._id),
        toResourceListItemDTO(document, currentUserId),
      ]),
    );
    const items = parsedBody.data.ids.flatMap((id) => {
      const item = itemsById.get(id);
      return item ? [item] : [];
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error(
      "Error en POST /api/resources/resolve:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "No se pudieron resolver los recursos" },
      { status: 500 },
    );
  }
}
