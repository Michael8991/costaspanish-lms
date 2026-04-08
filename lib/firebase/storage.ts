import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage";
import { storage } from "../firebase";

type UploadResult = {
  downloadUrl: string;
  storagePath: string;
};

type UploadOptions = {
  onProgress?: (progress: number) => void;
  allowedTypes?: string[];
  maxSizeBytes?: number;
};

export const uploadFileWithProgress = (
  file: File,
  path: string,
  options: UploadOptions = {}
): { task: UploadTask; promise: Promise<UploadResult> } => {
  const { onProgress, allowedTypes, maxSizeBytes } = options;

  if (!file) {
    throw new Error("No file provided");
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }

  if (maxSizeBytes && file.size > maxSizeBytes) {
    throw new Error(`File too large. Max allowed: ${maxSizeBytes} bytes`);
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");

  if (!normalizedPath) {
    throw new Error("Invalid upload path");
  }

  const fullPath = `${normalizedPath}/${fileName}`;
  const storageRef = ref(storage, fullPath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  const promise = new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath: fullPath,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });

  return { task: uploadTask, promise };
};