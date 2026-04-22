import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { ensureFirebaseAdmin } from "@/lib/firebase/admin";
import { RESOURCE_UPLOAD_RULES } from "@/lib/resource/upload/rule";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";

type UploadableFormat = keyof typeof RESOURCE_UPLOAD_RULES;
type UploadVariant = "main" | "thumbnail";

function sanitizeFileName(filename: string) {
  return filename.replace(/[^\w.\-]+/g, "_");
}

function buildStoragePath(
  format: UploadableFormat,
  variant: UploadVariant,
  filename: string
) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const id = randomUUID();

  if (variant === "thumbnail") {
    return `resources/pdfs/thumbnails/${id}.${extension}`;
  }

  switch (format) {
    case "pdf":
      return `resources/pdfs/${id}.${extension}`;
    case "image":
      return `resources/images/${id}.${extension}`;
    case "audio":
      return `resources/audios/${id}.${extension}`;
    case "video":
      return `resources/videos/${id}.${extension}`;
    default:
      throw new Error("Unsupported format");
  }
}

export async function POST(req: NextRequest) {
  try {
    const maybeUser = await requireAuth(req);

    if (!maybeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = maybeUser;

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const rawFormat = formData.get("format");
    const rawVariant = formData.get("variant");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (typeof rawFormat !== "string") {
      return NextResponse.json({ error: "Format is required" }, { status: 400 });
    }

    if (typeof rawVariant !== "string") {
      return NextResponse.json({ error: "Variant is required" }, { status: 400 });
    }

    if (rawVariant !== "main" && rawVariant !== "thumbnail") {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const format = rawFormat as UploadableFormat;
    const variant = rawVariant as UploadVariant;
    const rules = RESOURCE_UPLOAD_RULES[format];

    if (!rules) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    if (variant === "thumbnail") {
      if (file.type !== "image/jpeg") {
        return NextResponse.json(
          { error: `Thumbnail type not allowed: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Thumbnail too large. Max allowed: 2097152 bytes" },
          { status: 400 }
        );
      }
    } else {
      if (!rules.allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File type not allowed: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > rules.maxSizeBytes) {
        return NextResponse.json(
          { error: `File too large. Max allowed: ${rules.maxSizeBytes} bytes` },
          { status: 400 }
        );
      }
    }

    ensureFirebaseAdmin();

    const bucket = getStorage().bucket();
    const originalFilename = sanitizeFileName(file.name);
    const storagePath = buildStoragePath(format, variant, originalFilename);
    const buffer = Buffer.from(await file.arrayBuffer());

    const bucketFile = bucket.file(storagePath);

    await bucketFile.save(buffer, {
      metadata: {
        contentType: file.type || "application/octet-stream",
      },
    });

    const [signedUrl] = await bucketFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    return NextResponse.json(
      {
        fileUrl: signedUrl,
        storagePath,
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        variant,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown upload error";

    console.log("Error POST /api/resources/files/upload:", message);

    return NextResponse.json(
      { error: message},
      { status: 500 }
    );
  }
}