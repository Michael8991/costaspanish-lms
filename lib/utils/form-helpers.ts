import { FormatType } from "../constants/resource.constants";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function toDisplayLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toggleArrayValue<T>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((i) => i !== value)
    : [...current, value];
}


export function normalizeLooseStringArray(values: string): string[] {
  return [
    ...new Set(
      values
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function isValidUrl(value?: string) {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getAcceptByFormat(format?: FormatType) {
  switch (format) {
    case "pdf":
      return ".pdf,application/pdf";
    case "image":
      return "image/*";
    case "audio":
      return "audio/*";
    case "video":
      return "video/*";
    default:
      return "*/*";
  }
}

