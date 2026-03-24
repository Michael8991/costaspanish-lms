import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { Resource } from "@/models/ResourceProfile";
import {
  formatZodIssues,
  resourceIdParamSchema,
  updateResourceSchema,
} from "@/lib/validators/resource";
import { toResourceDetailDTO } from "@/lib/dto/resource.dto";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getCurrentUserId(user: { id?: string; _id?: string }) {
  return String(user.id ?? user._id ?? "");
}

function getCurrentUserObjectId(user: { id?: string; _id?: string }) {
  const rawId = getCurrentUserId(user);

  if (!Types.ObjectId.isValid(rawId)) return null;
  return new Types.ObjectId(rawId);
}

function isOwner(
  resourceOwnerId: unknown,
  currentUserObjectId: Types.ObjectId
): boolean {
  if (!resourceOwnerId) return false;
  return String(resourceOwnerId) === String(currentUserObjectId);
}

function canReadResource(
  user: { role: string },
  resource: {
    ownerTeacherId?: unknown;
    visibility: string;
    status: string;
  },
  currentUserObjectId: Types.ObjectId
) {
  if (user.role === "admin") return true;

  if (isOwner(resource.ownerTeacherId, currentUserObjectId)) return true;

  return resource.visibility === "shared" && resource.status === "published";
}

function canMutateResource(
  user: { role: string },
  resource: {
    ownerTeacherId?: unknown;
  },
  currentUserObjectId: Types.ObjectId
) {
  if (user.role === "admin") return true;
  return isOwner(resource.ownerTeacherId, currentUserObjectId);
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(_);

    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
      
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserObjectId = getCurrentUserObjectId(user);
    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 }
      );
    }

    const rawParams = await context.params;
    const parsedParams = resourceIdParamSchema.safeParse(rawParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid route params",
          details: formatZodIssues(parsedParams.error.issues),
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const resource = await Resource.findById(parsedParams.data.id);

    if (!resource) {
    return NextResponse.json(
        { error: "Recurso no encontrado" },
        { status: 404 }
    );
    }

    if (!canReadResource(user, resource, currentUserObjectId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
    {
        item: toResourceDetailDTO(resource.toObject(), getCurrentUserId(user)),
    },
    { status: 200 }
);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Error en GET /api/resources/[id]:", errorMessage);

    return NextResponse.json(
      { error: "Error al obtener el recurso" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      
      if (!user) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

    const currentUserObjectId = getCurrentUserObjectId(user);
    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 }
      );
    }

    const rawParams = await context.params;
    const parsedParams = resourceIdParamSchema.safeParse(rawParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid route params",
          details: formatZodIssues(parsedParams.error.issues),
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsedBody = updateResourceSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: formatZodIssues(parsedBody.error.issues),
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const resource = await Resource.findById(parsedParams.data.id);

    if (!resource) {
      return NextResponse.json(
        { error: "Recurso no encontrado" },
        { status: 404 }
      );
    }
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
    if (!canMutateResource(user, resource, currentUserObjectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = parsedBody.data;

    Object.assign(resource, payload);

    await resource.save();

    return NextResponse.json(
      {
        item: toResourceDetailDTO(resource.toObject(), getCurrentUserId(user)),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Datos de recurso no válidos",
          details: Object.values(error.errors).map((err) => ({
            path: err.path,
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Error en PATCH /api/resources/[id]:", errorMessage);

    return NextResponse.json(
      { error: "Error al actualizar el recurso" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(req);

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

    const currentUserObjectId = getCurrentUserObjectId(user);
    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 }
      );
    }

    const rawParams = await context.params;
    const parsedParams = resourceIdParamSchema.safeParse(rawParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          error: "Invalid route params",
          details: formatZodIssues(parsedParams.error.issues),
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const resource = await Resource.findById(parsedParams.data.id);

    if (!resource) {
      return NextResponse.json(
        { error: "Recurso no encontrado" },
        { status: 404 }
      );
    }

    if (!canMutateResource(user, resource, currentUserObjectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

   // 1. Cambiamos el estado para que desaparezca de las búsquedas
    resource.status = "deleted";
    resource.visibility = "private";

    // 2. Vaciamos las referencias del archivo principal
    resource.fileUrl = "";
    resource.fileSizeBytes = 0;
    
    // 3. Vaciamos las referencias de la miniatura
    resource.thumbnailUrl = "";
    resource.thumbnailStoragePath = "";
    resource.storagePath = "";

    // Guardamos en MongoDB
    await resource.save();

    return NextResponse.json(
      {
        success: true,
        item: toResourceDetailDTO(resource.toObject(), getCurrentUserId(user)),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Datos de recurso no válidos",
          details: Object.values(error.errors).map((err) => ({
            path: err.path,
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Error en DELETE /api/resources/[id]:", errorMessage);

    return NextResponse.json(
      { error: "Error al archivar el recurso" },
      { status: 500 }
    );
  }
}