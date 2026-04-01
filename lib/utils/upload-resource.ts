import { UploadedResourceMeta } from "@/components/dashboard/resources/AddResourceForm";
import { FormatType } from "../constants/resource.constants";
import { processAndUploadResource } from "../resource/upload/processResourceUpload";
import { deleteObject, ref } from "firebase/storage";
import { storage } from "../firebase";

export const uploadResourceFile = async (
  file: File,
  format: Exclude<FormatType, "external_link">,
  owner: string | null,
  oldStoragePath?: string | null,
  oldThumbnailPath?: string | null,
): Promise<UploadedResourceMeta> => {

  if (oldStoragePath) {
    try {
      await deleteObject(ref(storage, oldStoragePath));
    } catch (e) {
      console.warn("No se pudo eliminar el archivo antiguo:", e);
    }
    if (oldThumbnailPath) {
       try {
      await deleteObject(ref(storage, oldStoragePath));
    } catch (e) {
      console.warn("No se pudo eliminar el thumnnail antiguo:", e);
    }
    }
  }
  const result = await processAndUploadResource(file, format);
  
  return {
    fileUrl: result.fileUrl,
    storagePath: result.storagePath,
    originalFilename: result.originalFilename,
    mimeType: result.mimeType,
    fileSizeBytes: result.fileSizeBytes,
    pageCount: result.pageCount,
    durationSeconds: result.durationSeconds,
    thumbnailUrl: result.thumbnailUrl,
    thumbnailStoragePath: result.thumbnailStoragePath,
  };
};