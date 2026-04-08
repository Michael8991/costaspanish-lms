import { extractPdfMetadata, getMediaDuration } from "@/lib/utils/fileExtractors";
import { RESOURCE_UPLOAD_RULES, STORAGE_PATHS, UploadableFormat } from "./rule";
import { uploadFileWithProgress } from "@/lib/firebase/storage";

export const processAndUploadResource = async (file: File, format: UploadableFormat) => {
    const rules = RESOURCE_UPLOAD_RULES[format];
    const mainPath = STORAGE_PATHS[format];

    let pageCount: number | undefined;
    let durationSeconds: number | undefined;
    let thumbnailUrl: string | undefined;
    let thumbnailStoragePath: string | undefined;

    try {
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
          { type: "image/jpeg" },
        );

        const thumbResult = await uploadFileWithProgress(
          thumbFile,
          "resources/pdfs/thumbnails",
          {
            allowedTypes: ["image/jpeg"],
            maxSizeBytes: 2 * 1024 * 1024,
          },
        ).promise;

        thumbnailUrl = thumbResult.downloadUrl;
        thumbnailStoragePath = thumbResult.storagePath;
      }

      const mainResult = await uploadFileWithProgress(file, mainPath, {
        allowedTypes: rules.allowedTypes,
        maxSizeBytes: rules.maxSizeBytes,
      }).promise;

      return {
        storagePath: mainResult.storagePath,
        fileUrl: mainResult.downloadUrl,
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
      throw new Error("No se pudo procesar y subir el recurso");
    }
  };
