import { UploadedResourceMeta } from "@/components/dashboard/resources/AddResourceForm";
import { FormatType } from "@/lib/constants/resource.constants";
import { processAndUploadResource } from "../resource/upload/processResourceUpload";

type UpdateResourceFileParams = {
  resourceId: string;
  file: File;
  format: Exclude<FormatType, "external_link">;
};

export async function updateResourceFile({
  resourceId,
  file,
  format,
}: UpdateResourceFileParams): Promise<UploadedResourceMeta> {
  const uploadedMeta = await processAndUploadResource(file, format);

  const res = await fetch(`/api/resources/${resourceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileUrl: uploadedMeta.fileUrl,
      storagePath: uploadedMeta.storagePath,
      originalFilename: uploadedMeta.originalFilename,
      mimeType: uploadedMeta.mimeType,
      fileSizeBytes: uploadedMeta.fileSizeBytes,
      pageCount: uploadedMeta.pageCount,
      durationSeconds: uploadedMeta.durationSeconds,
      thumbnailUrl: uploadedMeta.thumbnailUrl,
      thumbnailStoragePath: uploadedMeta.thumbnailStoragePath,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "No se pudo actualizar el archivo");
  }

  return uploadedMeta;
}
