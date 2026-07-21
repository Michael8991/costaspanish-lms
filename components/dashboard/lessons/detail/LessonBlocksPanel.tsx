"use client";

import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  MinusCircle,
  Music,
  PlayCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface LessonBlocksPanelProps {
  lesson: LessonDetailDTO;
  resourceIds: string[];
}

type LessonBlockItem = LessonDetailDTO["blocks"][number] & {
  id?: string;
  _id?: string;
};

type ResourceItem = NonNullable<
  LessonDetailDTO["blocks"][number]["resourceItems"]
>[number];

type BlockCompletionStatus =
  | "completed"
  | "partially_completed"
  | "not_completed"
  | "skipped";

type BlockPartialUpdate = Partial<{
  title: LessonBlockItem["title"];
  type: LessonBlockItem["type"];
  cefrLevels: LessonBlockItem["cefrLevels"];
  skills: LessonBlockItem["skills"];
  tags: LessonBlockItem["tags"];
  resources: LessonBlockItem["resources"];
  plannedContent: LessonBlockItem["plannedContent"];
  completionStatus: BlockCompletionStatus;
  carryOverToNextLesson: LessonBlockItem["carryOverToNextLesson"];
  actualContent: LessonBlockItem["actualContent"];
  plannedObjectives: LessonBlockItem["plannedObjectives"];
  achievedObjectives: LessonBlockItem["achievedObjectives"];
  estimatedMinutes: LessonBlockItem["estimatedMinutes"];
  actualMinutes: LessonBlockItem["actualMinutes"];
  blockSuccessRating: LessonBlockItem["blockSuccessRating"];
  studentDifficultyLevel: LessonBlockItem["studentDifficultyLevel"];
  engagementLevel: LessonBlockItem["engagementLevel"];
  errorCategories: LessonBlockItem["errorCategories"];
  studentDifficultiesText: LessonBlockItem["studentDifficultiesText"];
  teacherReflection: LessonBlockItem["teacherReflection"];
  nextStepSuggestion: LessonBlockItem["nextStepSuggestion"];
}>;

const blockCompletionActions: {
  status: BlockCompletionStatus;
  label: string;
}[] = [
  { status: "completed", label: "Hecho" },
  { status: "partially_completed", label: "Parcial" },
  { status: "not_completed", label: "Pendiente" },
  { status: "skipped", label: "Saltado" },
];

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

function getBlockKey(block: LessonBlockItem, index: number) {
  return block.id ?? block._id ?? `${index}-${block.title}`;
}

function getBlockCompletionStatus(
  block: LessonBlockItem,
): BlockCompletionStatus {
  return block.completionStatus ?? "not_completed";
}

function getCompletionStatusLabel(status: BlockCompletionStatus) {
  if (status === "completed") return "Completado";
  if (status === "partially_completed") return "Parcial";
  if (status === "skipped") return "Saltado";
  return "Pendiente";
}

function getCompletionStatusClassName(status: BlockCompletionStatus) {
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "partially_completed") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "skipped") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  return "bg-gray-100 text-gray-600 ring-gray-200";
}

function BlockCompletionIcon({ status }: { status: BlockCompletionStatus }) {
  if (status === "completed") return <CheckCircle2 size={13} />;
  if (status === "partially_completed") return <MinusCircle size={13} />;
  if (status === "skipped") return <XCircle size={13} />;

  return <CircleDot size={13} />;
}

function ResourceFormatIcon({ format }: { format: string }) {
  if (format === "image") return <ImageIcon size={16} />;
  if (format === "audio") return <Music size={16} />;
  if (format === "video") return <PlayCircle size={16} />;
  if (format === "external_link") return <Link2 size={16} />;

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

function mapBlocksToPatchPayload(blocks: LessonBlockItem[]) {
  return blocks.map((block) => ({
    title: block.title,
    type: block.type,
    cefrLevels: block.cefrLevels ?? [],
    skills: block.skills ?? [],
    tags: block.tags ?? [],
    resources: block.resources ?? [],
    plannedContent: block.plannedContent,

    completionStatus: getBlockCompletionStatus(block),
    carryOverToNextLesson: block.carryOverToNextLesson ?? false,

    actualContent: block.actualContent,
    plannedObjectives: block.plannedObjectives ?? [],
    achievedObjectives: block.achievedObjectives ?? [],
    estimatedMinutes: block.estimatedMinutes,
    actualMinutes: block.actualMinutes,
    blockSuccessRating: block.blockSuccessRating,
    studentDifficultyLevel: block.studentDifficultyLevel,
    engagementLevel: block.engagementLevel,
    errorCategories: block.errorCategories ?? [],
    studentDifficultiesText: block.studentDifficultiesText,
    teacherReflection: block.teacherReflection,
    nextStepSuggestion: block.nextStepSuggestion,
  }));
}

export default function LessonBlocksPanel({
  lesson,
}: LessonBlocksPanelProps) {
  const [blocks, setBlocks] = useState<LessonBlockItem[]>(
    () => lesson.blocks as LessonBlockItem[],
  );

  useEffect(() => {
    setBlocks(lesson.blocks as LessonBlockItem[]);
  }, [lesson.blocks]);
  const [expandedBlockKeys, setExpandedBlockKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [updatingBlockKey, setUpdatingBlockKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allResourceItems = useMemo(() => {
    return getUniqueResources(
      blocks.flatMap((block) => block.resourceItems ?? []),
    );
  }, [blocks]);
  const canOpenAllResources = allResourceItems.some((resource) => resource.url);

  const toggleExpandedBlock = (blockKey: string) => {
    setExpandedBlockKeys((current) => {
      const next = new Set(current);

      if (next.has(blockKey)) {
        next.delete(blockKey);
      } else {
        next.add(blockKey);
      }

      return next;
    });
  };

  const saveBlocks = async (nextBlocks: LessonBlockItem[]) => {
    const response = await fetch(`/api/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: mapBlocksToPatchPayload(nextBlocks),
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Error al actualizar los bloques");
    }
  };

  const updateBlock = async (
    blockKey: string,
    partialUpdate: BlockPartialUpdate,
  ) => {
    const previousBlocks = blocks;
    const nextBlocks = blocks.map((block, index) => {
      if (getBlockKey(block, index) !== blockKey) {
        return block;
      }

      return { ...block, ...partialUpdate };
    });

    setUpdatingBlockKey(blockKey);
    setError(null);
    setBlocks(nextBlocks);

    try {
      await saveBlocks(nextBlocks);
    } catch (error) {
      setBlocks(previousBlocks);
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setUpdatingBlockKey(null);
    }
  };

  const updateBlockCompletionStatus = async (
    blockKey: string,
    completionStatus: BlockCompletionStatus,
  ) => {
    const currentBlock = blocks.find(
      (block, index) => getBlockKey(block, index) === blockKey,
    );

    if (!currentBlock) {
      return;
    }

    await updateBlock(blockKey, {
      completionStatus,
      carryOverToNextLesson:
        completionStatus === "completed"
          ? false
          : (currentBlock.carryOverToNextLesson ?? false),
    });
  };

  const toggleCarryOverToNextLesson = async (blockKey: string) => {
    const currentBlock = blocks.find(
      (block, index) => getBlockKey(block, index) === blockKey,
    );

    if (!currentBlock) {
      return;
    }

    await updateBlock(blockKey, {
      carryOverToNextLesson: !(currentBlock.carryOverToNextLesson ?? false),
    });
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-950">
            Bloques de la clase
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Marca el avance de cada bloque y reutiliza lo que quede pendiente.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            Esta lección todavía no tiene bloques.
          </div>
        ) : (
          blocks.map((block, index) => {
            const blockKey = getBlockKey(block, index);
            const blockResources = block.resourceItems ?? [];
            const canOpenBlockResources = blockResources.some(
              (resource) => resource.url,
            );
            const isExpanded = expandedBlockKeys.has(blockKey);
            const isUpdating = updatingBlockKey === blockKey;
            const completionStatus = getBlockCompletionStatus(block);
            const carryOverToNextLesson = block.carryOverToNextLesson ?? false;

            return (
              <article
                key={blockKey}
                className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition hover:border-gray-300 hover:bg-white"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => toggleExpandedBlock(blockKey)}
                      className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-gray-950">
                            {block.title || "Bloque sin título"}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${getCompletionStatusClassName(
                              completionStatus,
                            )}`}
                          >
                            <BlockCompletionIcon status={completionStatus} />
                            {getCompletionStatusLabel(completionStatus)}
                          </span>

                          {carryOverToNextLesson && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                              <RotateCcw size={11} />
                              Reutilizar
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-1 text-sm text-gray-500">
                          {block.plannedContent || "Sin contenido planificado."}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                            {formatLabel(block.type)}
                          </span>

                          {block.estimatedMinutes ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                              <Clock3 size={11} />
                              {block.estimatedMinutes} min
                            </span>
                          ) : null}

                          {blockResources.length > 0 ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                              {blockResources.length} recurso
                              {blockResources.length === 1 ? "" : "s"}
                            </span>
                          ) : null}

                          {block.cefrLevels.slice(0, 2).map((level) => (
                            <span
                              key={`${blockKey}-${level}`}
                              className="rounded-full bg-[#9e2727]/10 px-2 py-0.5 text-[11px] font-medium text-[#9e2727]"
                            >
                              {level}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpandedBlock(blockKey)}
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-200/70 pt-3">
                    {blockCompletionActions.map((action) => {
                      const isActive = completionStatus === action.status;

                      return (
                        <button
                          key={action.status}
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            updateBlockCompletionStatus(blockKey, action.status)
                          }
                          className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isActive
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {isUpdating ? "..." : action.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={isUpdating || completionStatus === "completed"}
                      onClick={() => toggleCarryOverToNextLesson(blockKey)}
                      className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        carryOverToNextLesson
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Reutilizar
                    </button>

                    <button
                      type="button"
                      disabled={!canOpenBlockResources}
                      onClick={() => openResources(blockResources)}
                      className="ml-auto cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Abrir recursos
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Contenido planificado
                          </p>
                          <p className="mt-1 text-sm leading-6 text-gray-600">
                            {block.plannedContent ||
                              "Sin contenido planificado."}
                          </p>
                        </div>

                        {(block.cefrLevels.length > 0 ||
                          block.skills.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {block.cefrLevels.map((level) => (
                              <span
                                key={`${blockKey}-expanded-${level}`}
                                className="rounded-full bg-[#9e2727]/10 px-2.5 py-1 text-[11px] font-medium text-[#9e2727]"
                              >
                                {level}
                              </span>
                            ))}

                            {block.skills.map((skill) => (
                              <span
                                key={`${blockKey}-expanded-${skill}`}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
                              >
                                {formatLabel(skill)}
                              </span>
                            ))}
                          </div>
                        )}

                        {blockResources.length > 0 && (
                          <div>
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

                        {(block.actualContent ||
                          block.teacherReflection ||
                          block.nextStepSuggestion) && (
                          <div className="grid gap-3 md:grid-cols-3">
                            {block.actualContent && (
                              <div className="rounded-2xl bg-gray-50 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                  Realidad
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {block.actualContent}
                                </p>
                              </div>
                            )}

                            {block.teacherReflection && (
                              <div className="rounded-2xl bg-gray-50 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                  Reflexión
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {block.teacherReflection}
                                </p>
                              </div>
                            )}

                            {block.nextStepSuggestion && (
                              <div className="rounded-2xl bg-gray-50 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                  Próximo paso
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {block.nextStepSuggestion}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ExternalLink size={15} />
          Abrir todos los recursos
        </button>
      </div>
    </section>
  );
}
