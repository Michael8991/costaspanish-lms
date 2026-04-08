import { FormatType } from "@/lib/constants/resource.constants";

export type UploadableFormat = Exclude<FormatType, "external_link">;

export const STORAGE_PATHS = {
  pdf: "resources/pdfs",
  image: "resources/images",
  audio: "resources/audios",
  video: "resources/videos",
} satisfies Record<UploadableFormat, string>;

export const RESOURCE_UPLOAD_RULES = {
  pdf: {
    allowedTypes: ["application/pdf"],
    maxSizeBytes: 15 * 1024 * 1024,
  },
  image: {
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 8 * 1024 * 1024,
  },
  audio: {
    allowedTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"],
    maxSizeBytes: 25 * 1024 * 1024,
  },
  video: {
    allowedTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxSizeBytes: 150 * 1024 * 1024,
  },
} satisfies Record<
  UploadableFormat,
  { allowedTypes: string[]; maxSizeBytes: number }
>;