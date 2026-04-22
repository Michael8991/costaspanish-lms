import { extractPdfMetadata, getMediaDuration } from "@/lib/utils/fileExtractors";
import { RESOURCE_UPLOAD_RULES, UploadableFormat } from "./rule";

type UploadApiResponse = {
  fileUrl: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
};

async function uploadFileThroughApi(
  file: File,
  format: UploadableFormat,
  variant: "main" | "thumbnail"
): Promise<UploadApiResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", format);
  formData.append("variant", variant);

  const response = await fetch("/api/resources/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al subir el archivo");
  }

  return data;
}

export const processAndUploadResource = async (
  file: File,
  format: UploadableFormat
) => {
  const rules = RESOURCE_UPLOAD_RULES[format];

  let pageCount: number | undefined;
  let durationSeconds: number | undefined;
  let thumbnailUrl: string | undefined;
  let thumbnailStoragePath: string | undefined;

  try {
    if (!rules.allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}`);
    }

    if (file.size > rules.maxSizeBytes) {
      throw new Error(
        `Archivo demasiado grande. Máximo permitido: ${rules.maxSizeBytes} bytes`
      );
    }

    if (format === "audio" || format === "video") {
      durationSeconds = await getMediaDuration(file);
    }

    if (format === "pdf") {
      const pdfData = await extractPdfMetadata(file);
      pageCount = pdfData.pageCount;

      const safeBaseName = file.name.replace(/\.pdf$/i, "");
      const thumbFile = new File(
        [pdfData.thumbnailBlob],
        `thumb_${safeBaseName}.jpg`,
        { type: "image/jpeg" }
      );

      const thumbResult = await uploadFileThroughApi(
        thumbFile,
        "image",
        "thumbnail"
      );

      thumbnailUrl = thumbResult.fileUrl;
      thumbnailStoragePath = thumbResult.storagePath;
    }

    const mainResult = await uploadFileThroughApi(file, format, "main");

    return {
      storagePath: mainResult.storagePath,
      fileUrl: mainResult.fileUrl,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
      pageCount,
      durationSeconds,
      thumbnailUrl,
      thumbnailStoragePath,
    };
  } catch (error) {
    console.error("Error uploading resource:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "No se pudo procesar y subir el recurso"
    );
  }
};