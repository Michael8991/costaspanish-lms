export interface ResourcePreviewSource {
  type?: string | null;
  format?: string | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
  fileUrl?: string | null;
}

export function isImageResource(resource: ResourcePreviewSource): boolean {
  return (
    resource.type === "image" ||
    resource.format === "image" ||
    Boolean(resource.mimeType?.startsWith("image/"))
  );
}

export function getResourcePreviewUrl(
  resource: ResourcePreviewSource,
): string | undefined {
  const thumbnailUrl = resource.thumbnailUrl?.trim();

  if (thumbnailUrl) {
    return thumbnailUrl;
  }

  const fileUrl = resource.fileUrl?.trim();

  if (isImageResource(resource) && fileUrl) {
    return fileUrl;
  }

  return undefined;
}
