"use client";

import { ResourceDetailDTO } from "@/lib/dto/resource.dto";
import {
  Check,
  Copy,
  Eye,
  FileText,
  Globe,
  Headphones,
  Layers3,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface previewResourceProps {
  resource: ResourceDetailDTO;
  locale: string;
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};

interface CopyLinkButtonProps {
  url: string;
}

function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.log("Error al copiar en el portapapeles: ", error);
    }
  };

  return (
    <>
      <button
        onClick={handleCopy}
        className={`hover:bg-green-200 cursor-pointer hover:text-green-500 hover:border-green-400 inline-flex border border-gray-100 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-light shadow-md text-gray-700 transition
        ${
          isCopied
            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-green-200 hover:text-green-700"
        }
      `}
      >
        {/* Animación súper suave al cambiar de icono */}
        {isCopied ? (
          <Check
            size={16}
            className="text-green-600 animate-in zoom-in duration-200"
          />
        ) : (
          <Copy size={16} className="" />
        )}

        {isCopied ? "¡Copiado!" : "Copiar enlace"}
      </button>
    </>
  );
}

export function truncateUrl(url: string, maxLength: number = 50): string {
  if (!url || url.length <= maxLength) return url;

  const charsToShow = maxLength - 3; // Restamos los puntos suspensivos
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    url.substring(0, frontChars) + "..." + url.substring(url.length - backChars)
  );
}

function ResourcePreview({ resource }: { resource: ResourceDetailDTO }) {
  const openHref =
    resource.asset.format === "external_link"
      ? resource.asset.externalUrl
      : resource.storage.fileUrl;

  if (resource.asset.format === "external_link") {
    let host = "";
    try {
      host = resource.asset.externalUrl
        ? new URL(resource.asset.externalUrl).hostname
        : "";
    } catch {
      host = "";
    }

    return (
      <>
        <div className="overflow-hidden rounded-lg border border-orange-200 bg-linear-to-br from-orange-50 to-white p-3">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-start gap-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-200">
                <Globe className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <p className="mb-1 text-md font-medium text-orange-700">
                  External resource
                </p>
                <h3 className="text-sm font-light text-slate-900">
                  {host ? (
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                      {host}
                    </p>
                  ) : null}
                </h3>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full justify-center mt-4">
          {openHref ? (
            <a
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-blue-100 hover:text-blue-500 hover:border-blue-400 inline-flex border border-gray-100 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-light shadow-md text-gray-700 transition"
            >
              <Eye className="h-4 w-4" />
              Abrir link
            </a>
          ) : null}
          <CopyLinkButton url={host} />
          {/* {resource.asset.externalUrl || "No external URL available"} */}
        </div>
      </>
    );
  }

  if (resource.asset.format === "pdf" || resource.asset.format === "image") {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="relative aspect-video w-full  h-80">
          {resource.asset.thumbnailUrl ? (
            <img
              src={resource.asset.thumbnailUrl}
              alt={resource.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              {resource.asset.format === "pdf" ? (
                <FileText className="h-16 w-16 text-slate-300" />
              ) : (
                <>
                  <div className="relative w-full h-70  overflow-hidden bg-white flex items-center justify-center p-4">
                    <Image
                      src={resource.storage.fileUrl!}
                      alt={resource.title}
                      fill={true}
                      className="max-w-full max-h-full rounded-lg object-contain shadow-md"
                      priority
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col border-t border-slate-100 p-5 md:flex-row md:items-center justify-center">
          {resource.storage.fileUrl ? (
            <a
              href={resource.storage.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mb-4 flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50"
            >
              <Eye className="h-4 w-4" />
              {resource.asset.format === "pdf" ? "Open PDF" : "Open image"}
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (resource.asset.format === "audio" || resource.asset.format === "video") {
    const MediaIcon = resource.asset.format === "audio" ? Headphones : Video;

    return (
      <>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <MediaIcon className="h-8 w-8 text-slate-700" />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">
                  {resource.asset.format === "audio"
                    ? "Audio track"
                    : "Video clip"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Duration: {formatDuration(resource.asset.durationSeconds)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center justify-center mt-4">
          {resource.storage.fileUrl ? (
            <a
              href={resource.storage.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center hover:bg-blue-100 hover:text-blue-500 hover:border-blue-400 inline-flex border border-gray-100 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-light shadow-md text-gray-700 transition"
            >
              <Eye className="h-4 w-4" />
              Abrir {resource.asset.format}
            </a>
          ) : null}
          {/* <button className="hover:bg-green-100  hover:text-green-700 hover:border-green-400 cursor-pointer inline-flex border border-gray-100 items-center justify-center gap-2 rounded-lg  px-4 py-2 text-xs font-light shadow-md text-gray-700 transition">
            <FileText className="h-4 w-4" />
            Ver transcripción
          </button> */}
        </div>
      </>
    );
  }

  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
      Preview not available for this resource.
    </div>
  );
}

export default function PreviewResourceSection({
  resource,
}: previewResourceProps) {
  return (
    <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm md:p-8m">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-2 shadow-xs">
          <Layers3 className="h-4 w-4 text-slate-700 " />
        </div>
        <h2 className="text-lg font-medium text-slate-900">Vista rápidas</h2>
      </div>
      <ResourcePreview resource={resource} />
    </section>
  );
}
