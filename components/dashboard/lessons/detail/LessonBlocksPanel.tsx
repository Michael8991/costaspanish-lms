"use client";

import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import {
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  Music,
  PlayCircle,
} from "lucide-react";

interface LessonBlocksPanelProps {
  lesson: LessonDetailDTO;
  resourceIds: string[];
}

type ResourceItem = NonNullable<
  LessonDetailDTO["blocks"][number]["resourceItems"]
>[number];

function openResources(resources: { url?: string }[]) {
  resources.forEach((resource) => {
    if (!resource.url) return;

    window.open(resource.url, "_blank", "noopener,noreferrer");
  });
}

function getUniqueResources(
  resources: NonNullable<LessonDetailDTO["blocks"][number]["resourceItems"]>,
) {
  return Array.from(
    new Map(resources.map((resource) => [resource.id, resource])).values(),
  );
}

function ResourceFormatIcon({ format }: { format: string }) {
  if (format === "image") {
    return <ImageIcon size={16} />;
  }

  if (format === "audio") {
    return <Music size={16} />;
  }

  if (format === "video") {
    return <PlayCircle size={16} />;
  }

  if (format === "external_link") {
    return <Link2 size={16} />;
  }

  return <FileText size={16} />;
}

function ResourcePill({ resource }: { resource: ResourceItem }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/resource flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 transition hover:border-[#9e2727]/30 hover:bg-[#9e2727]/5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition group-hover/resource:bg-[#9e2727]/10 group-hover/resource:text-[#9e2727]">
          <ResourceFormatIcon format={resource.format} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {resource.title}
          </p>
          <p className="text-xs text-gray-400">
            {formatLabel(resource.format)}
          </p>
        </div>
      </div>
    </a>
  );
}

export default function LessonBlocksPanel({
  lesson,
  resourceIds,
}: LessonBlocksPanelProps) {
  const allResourceItems = getUniqueResources(
    lesson.blocks.flatMap((block) => block.resourceItems ?? []),
  );

  const canOpenAllResources = allResourceItems.some((resource) => resource.url);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-950">
            Bloques de la clase
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Planificación de contenidos, materiales y notas de trabajo.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {lesson.blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            Esta lección todavía no tiene bloques.
          </div>
        ) : (
          lesson.blocks.map((block, index) => {
            const blockResources = block.resourceItems ?? [];
            const canOpenBlockResources = blockResources.some(
              (resource) => resource.url,
            );

            return (
              <article
                key={block._id ?? index}
                className="rounded-3xl border border-gray-200 bg-gray-50/70 p-5 transition hover:border-gray-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">
                        Bloque {index + 1}
                      </span>

                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                        {formatLabel(block.type)}
                      </span>

                      {block.estimatedMinutes && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                          <Clock3 size={11} />
                          {block.estimatedMinutes} min
                        </span>
                      )}

                      {blockResources.length > 0 && (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                          {blockResources.length} recurso
                          {blockResources.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-gray-950">
                      {block.title || "Bloque sin título"}
                    </h3>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                      {block.plannedContent || "Sin contenido planificado."}
                    </p>

                    {(block.cefrLevels.length > 0 ||
                      block.skills.length > 0) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {block.cefrLevels.map((level) => (
                          <span
                            key={`${block._id ?? block.title}-${level}`}
                            className="rounded-full bg-[#9e2727]/10 px-2.5 py-1 text-[11px] font-medium text-[#9e2727]"
                          >
                            {level}
                          </span>
                        ))}

                        {block.skills.slice(0, 4).map((skill) => (
                          <span
                            key={`${block._id ?? block.title}-${skill}`}
                            className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
                          >
                            {formatLabel(skill)}
                          </span>
                        ))}
                      </div>
                    )}

                    {blockResources.length > 0 && (
                      <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Recursos del bloque
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {blockResources.map((resource) => (
                            <ResourcePill
                              key={resource.id}
                              resource={resource}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="hidden shrink-0 md:block">
                    <button
                      type="button"
                      disabled={!canOpenBlockResources}
                      onClick={() => openResources(blockResources)}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Abrir recursos
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
        <p className="text-xs text-gray-500">
          {allResourceItems.length} recurso
          {allResourceItems.length === 1 ? "" : "s"} asociado
          {allResourceItems.length === 1 ? "" : "s"} a esta clase.
        </p>

        <button
          type="button"
          disabled={!canOpenAllResources}
          onClick={() => openResources(allResourceItems)}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ExternalLink size={15} />
          Abrir todos los recursos
        </button>
      </div>
    </section>
  );
}
