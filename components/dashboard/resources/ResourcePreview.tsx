"use client";

import { type ReactNode, useState } from "react";

import {
  getResourcePreviewUrl,
  type ResourcePreviewSource,
} from "@/lib/utils/resource-preview";

interface ResourcePreviewProps {
  resource: ResourcePreviewSource & {
    title?: string | null;
  };
  fallback: ReactNode;
  imageOverlay?: ReactNode;
  className?: string;
  imageClassName?: string;
}

export default function ResourcePreview({
  resource,
  fallback,
  imageOverlay,
  className = "",
  imageClassName = "h-full w-full object-cover",
}: ResourcePreviewProps) {
  const previewUrl = getResourcePreviewUrl(resource);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(previewUrl && failedUrl !== previewUrl);

  return (
    <div className={`overflow-hidden ${className}`}>
      {showImage ? (
        <>
          {/* Resource URLs can come from Firebase or imported external hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={resource.title?.trim() || "Recurso"}
            loading="lazy"
            onError={() => setFailedUrl(previewUrl ?? null)}
            className={imageClassName}
          />
          {imageOverlay}
        </>
      ) : (
        fallback
      )}
    </div>
  );
}
