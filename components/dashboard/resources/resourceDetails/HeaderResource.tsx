"use client";

import { ResourceDetailDTO } from "@/lib/dto/resource.dto";
import {
  ChevronDown,
  FileInput,
  FileText,
  Headphones,
  ImageIcon,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const getStatusClasses = (status: string) => {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "draft":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "archived":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    case "deleted":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
};

const getVisibilityClasses = (visibility: string) => {
  switch (visibility) {
    case "shared":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "private":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
};

const formatMetaMap = {
  pdf: {
    label: "PDF",
    icon: FileText,
    classes: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    classes: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  },
  audio: {
    label: "Audio",
    icon: Headphones,
    classes: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  },
  video: {
    label: "Video",
    icon: Video,
    classes: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  },
  external_link: {
    label: "External Link",
    icon: LinkIcon,
    classes: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
} as const;

const toDisplayLabel = (value: string) => {
  if (!value) return "";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

interface ResourceProps {
  locale: string;
  resource: ResourceDetailDTO;
}

export default function HeaderResource({ resource, locale }: ResourceProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const formatMeta = formatMetaMap[resource.asset.format];
  const FormatIcon = formatMeta.icon;

  return (
    <div className="col-span-2">
      <section className="rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden">
        {/* Banda de estado */}
        <div
          className={`h-0.5 w-full ${
            resource.status === "published"
              ? "bg-emerald-400"
              : resource.status === "draft"
                ? "bg-amber-400"
                : resource.status === "archived"
                  ? "bg-slate-300"
                  : "bg-slate-200"
          }`}
        />

        <div className="px-6 py-5 md:px-8 md:py-6">
          {/* Fila superior: título + botones */}
          <div className="flex items-start justify-between gap-6">
            {/* Izquierda: título */}
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl leading-snug">
              {resource.title.charAt(0).toUpperCase() + resource.title.slice(1)}
            </h1>

            {/* Derecha: botones compactos alineados con el título */}
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/${locale}/dashboard/resources/${resource.id}/edit`}
                className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50"
              >
                <Pencil className="h-4 w-4" />
                Editar recurso
              </Link>

              <button className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={14} />
                Archivar
              </button>
              <button className="group flex items-center justify-center cursor-pointer gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50">
                <FileInput size={14} />
                Agregar a una clase
              </button>
            </div>
          </div>

          {/* Fila inferior: badges pegados bajo el título */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <Badge className={getStatusClasses(resource.status)}>
              {toDisplayLabel(resource.status)}
            </Badge>
            <Badge className={getVisibilityClasses(resource.visibility)}>
              {toDisplayLabel(resource.visibility)}
            </Badge>
            <Badge className={formatMeta.classes}>
              <FormatIcon className="h-3 w-3" />
              {formatMeta.label}
            </Badge>
            <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              {toDisplayLabel(resource.pedagogicalType)}
            </Badge>
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden mt-5">
        {resource.description && (
          <div className="my-5">
            <div className="flex w-full items-center">
              <button
                onClick={() => setIsDescriptionOpen((v) => !v)}
                className="cursor-pointer flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-700 transition-colors w-full justify-between px-5 py-1"
              >
                {isDescriptionOpen ? "Ocultar descripción" : "Ver descripción"}
                <ChevronDown
                  size={20}
                  className={`transition-transform duration-200 ${isDescriptionOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isDescriptionOpen
                  ? "max-h-96 opacity-100 mt-3"
                  : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-xs leading-relaxed text-gray-700 max-w-2xl border-l-2 border-lime-500 pl-3">
                {resource.description}
              </p>
            </div>
          </div>
        )}

        {!resource.description && (
          <p className="mt-2 text-sm text-slate-400 italic">Sin descripción.</p>
        )}
      </section>
    </div>
  );
}
