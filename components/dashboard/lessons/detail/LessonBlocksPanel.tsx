"use client";

import LessonBlockCategoryStack from "@/components/dashboard/lessons/LessonBlockCategoryStack";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { normalizeLessonBlockCategories } from "@/lib/utils/lesson-block-categories";
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
  Paperclip,
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
  lineageId: LessonBlockItem["lineageId"];
  title: LessonBlockItem["title"];
  type: LessonBlockItem["type"];
  categories: LessonBlockItem["categories"];
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
  origin: LessonBlockItem["origin"];
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

const ERROR_CATEGORY_OPTIONS = [
  { value: "grammar", label: "Gramática" },
  { value: "vocabulary", label: "Vocabulario" },
  { value: "pronunciation", label: "Pronunciación" },
  { value: "fluency", label: "Fluidez" },
  { value: "listening", label: "Comprensión oral" },
  { value: "speaking", label: "Expresión oral" },
  { value: "reading", label: "Lectura" },
  { value: "writing", label: "Escritura" },
  { value: "confidence", label: "Confianza" },
  { value: "accuracy", label: "Precisión" },
] as const;

type ErrorCategoryValue = (typeof ERROR_CATEGORY_OPTIONS)[number]["value"];

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

function formatBlockOrder(order: number) {
  return String(order + 1).padStart(2, "0");
}

function getBlockCompletionStatus(
  block: LessonBlockItem,
): BlockCompletionStatus {
  return block.completionStatus ?? "not_completed";
}

function formatOriginDate(value?: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getCompletionStatusVisual(status?: BlockCompletionStatus) {
  if (status === "completed") {
    return {
      label: "Completado",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (status === "partially_completed") {
    return {
      label: "Parcial",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  if (status === "skipped") {
    return {
      label: "Saltado",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  return {
    label: "Pendiente",
    className: "bg-gray-100 text-gray-700 ring-gray-200",
  };
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

interface BlockTextareaEditorProps {
  label: string;
  placeholder: string;
  initialValue: string;
  isUpdating: boolean;
  saveLabel: string;
  onSave: (value: string) => Promise<void> | void;
}

function BlockTextareaEditor({
  label,
  placeholder,
  initialValue,
  isUpdating,
  saveLabel,
  onSave,
}: BlockTextareaEditorProps) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  const hasChanges = draft !== initialValue;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </label>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
      />

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          disabled={!hasChanges || isUpdating}
          onClick={() => onSave(draft)}
          className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isUpdating ? "Guardando..." : saveLabel}
        </button>
      </div>
    </div>
  );
}

interface ErrorCategoriesEditorProps {
  selectedCategories: string[];
  isUpdating: boolean;
  onToggleCategory: (category: ErrorCategoryValue) => Promise<void> | void;
}

function ErrorCategoriesEditor({
  selectedCategories,
  isUpdating,
  onToggleCategory,
}: ErrorCategoriesEditorProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Errores detectados
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {ERROR_CATEGORY_OPTIONS.map((option) => {
          const isSelected = selectedCategories.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              disabled={isUpdating}
              onClick={() => onToggleCategory(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected
                  ? "border-[#9e2727]/30 bg-[#9e2727]/10 text-[#9e2727]"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ActualMinutesEditorProps {
  estimatedMinutes?: number;
  initialValue?: number;
  isUpdating: boolean;
  onSave: (value: number | undefined) => Promise<void> | void;
}

function ActualMinutesEditor({
  estimatedMinutes,
  initialValue,
  isUpdating,
  onSave,
}: ActualMinutesEditorProps) {
  const initialDraft = initialValue !== undefined ? String(initialValue) : "";
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const parsedValue = draft.trim() === "" ? undefined : Number(draft);
  const hasInvalidValue =
    parsedValue !== undefined &&
    (!Number.isFinite(parsedValue) || parsedValue < 0);
  const hasChanges = draft !== initialDraft;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Tiempo del bloque
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Previsto:{" "}
            <span className="font-medium text-gray-900">
              {estimatedMinutes ?? "—"} min
            </span>{" "}
            / Real:{" "}
            <span className="font-medium text-gray-900">
              {parsedValue ?? "—"} min
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Min"
            className="h-9 w-24 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />

          <button
            type="button"
            disabled={!hasChanges || hasInvalidValue || isUpdating}
            onClick={() => onSave(parsedValue)}
            className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUpdating ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {hasInvalidValue && (
        <p className="mt-2 text-xs text-red-600">
          Introduce un número válido de minutos.
        </p>
      )}
    </div>
  );
}

function mapBlocksToPatchPayload(blocks: LessonBlockItem[]) {
  return blocks.map((block, index) => ({
    lineageId: block.lineageId,
    order: block.order ?? index,
    title: block.title,
    type: block.type,
    categories: normalizeLessonBlockCategories(
      block.type,
      block.categories,
    ),
    cefrLevels: block.cefrLevels ?? [],
    skills: block.skills ?? [],
    tags: block.tags ?? [],
    resources: Array.from(new Set(block.resources ?? [])),
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
    origin: block.origin?.sourceLessonId
      ? {
          sourceLessonId: block.origin.sourceLessonId,
          sourceBlockId: block.origin.sourceBlockId,
          sourceCourseId: block.origin.sourceCourseId,
          sourceStudentIds: block.origin.sourceStudentIds ?? [],
          sourceLessonTitle: block.origin.sourceLessonTitle,
          sourceLessonDate: block.origin.sourceLessonDate,
          sourceBlockTitle: block.origin.sourceBlockTitle,
        }
      : undefined,
  }));
}

export default function LessonBlocksPanel({ lesson }: LessonBlocksPanelProps) {
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
  const orderedBlocks = useMemo(
    () =>
      blocks
        .map((block, index) => ({
          block,
          order: block.order ?? index,
        }))
        .sort((firstBlock, secondBlock) => firstBlock.order - secondBlock.order)
        .map(({ block }) => block),
    [blocks],
  );
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
        {orderedBlocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            Esta lección todavía no tiene bloques.
          </div>
        ) : (
          orderedBlocks.map((block, index) => {
            const blockKey = getBlockKey(block, index);
            const blockResources = block.resourceItems ?? [];
            const resourceCount =
              blockResources.length || block.resources?.length || 0;
            const canOpenBlockResources = blockResources.some(
              (resource) => resource.url,
            );
            const isExpanded = expandedBlockKeys.has(blockKey);
            const isUpdating = updatingBlockKey === blockKey;
            const completionStatus = getBlockCompletionStatus(block);
            const completionVisual =
              getCompletionStatusVisual(completionStatus);
            const carryOverToNextLesson = block.carryOverToNextLesson ?? false;
            const originDate = formatOriginDate(block.origin?.sourceLessonDate);
            const blockCategories = normalizeLessonBlockCategories(
              block.type,
              block.categories,
            );
            const displayOrder = block.order ?? index;
            const displayedMinutes =
              block.actualMinutes !== undefined
                ? { label: "Real", value: block.actualMinutes }
                : block.estimatedMinutes !== undefined
                  ? { label: "Plan", value: block.estimatedMinutes }
                  : null;

            return (
              <article
                key={blockKey}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                  isExpanded
                    ? "border-[#9e2727]/25 ring-2 ring-[#9e2727]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpandedBlock(blockKey)}
                      className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-left sm:gap-3"
                    >
                      <span className="mt-2 shrink-0 font-mono text-xs font-semibold tracking-wider text-gray-400">
                        {formatBlockOrder(displayOrder)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <LessonBlockCategoryStack
                          categories={blockCategories}
                        />
                        <div className="mb-1 mt-2 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-gray-950">
                            {block.title || "Bloque sin título"}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${completionVisual.className}`}
                          >
                            <BlockCompletionIcon status={completionStatus} />
                            {completionVisual.label}
                          </span>

                          {carryOverToNextLesson && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                              <RotateCcw size={11} />
                              Reutilizar
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-2 text-xs leading-5 text-gray-500 sm:text-sm">
                          {block.plannedContent ||
                            block.actualContent ||
                            "Sin contenido planificado."}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                          {displayedMinutes ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                              <Clock3 size={11} />
                              {displayedMinutes.label}: {displayedMinutes.value} min
                            </span>
                          ) : null}

                          {resourceCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                              <Paperclip size={11} />
                              {resourceCount} recurso
                              {resourceCount === 1 ? "" : "s"}
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
                          {block.cefrLevels.length > 2 && (
                            <span className="font-medium text-gray-500">
                              +{block.cefrLevels.length - 2}
                            </span>
                          )}

                          {block.skills.slice(0, 2).map((skill) => (
                            <span
                              key={`${blockKey}-${skill}`}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                            >
                              {formatLabel(skill)}
                            </span>
                          ))}
                          {block.skills.length > 2 && (
                            <span className="font-medium text-gray-500">
                              +{block.skills.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpandedBlock(blockKey)}
                      aria-label={isExpanded ? "Plegar bloque" : "Abrir bloque"}
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
                        {block.origin && (
                          <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-100">
                            <div className="flex items-center gap-1.5">
                              <RotateCcw size={12} />
                              <span>
                                Viene de:{" "}
                                {block.origin.sourceLessonTitle ??
                                  "clase anterior"}
                                {originDate ? ` · ${originDate}` : ""}
                              </span>
                            </div>

                            {block.origin.sourceBlockTitle &&
                              block.origin.sourceBlockTitle !== block.title && (
                                <p className="mt-1 pl-[18px] text-blue-600">
                                  Bloque original:{" "}
                                  {block.origin.sourceBlockTitle}
                                </p>
                              )}
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            Contenido planificado
                          </p>
                          <p className="mt-1 text-sm leading-6 text-gray-600">
                            {block.plannedContent ||
                              "Sin contenido planificado."}
                          </p>
                        </div>

                        <BlockTextareaEditor
                          label="Qué se ha trabajado realmente"
                          placeholder="Ej: Se ha repasado el pretérito indefinido y solo dio tiempo a corregir la primera actividad..."
                          initialValue={block.actualContent ?? ""}
                          isUpdating={isUpdating}
                          saveLabel="Guardar realidad"
                          onSave={(value) =>
                            updateBlock(blockKey, {
                              actualContent: value.trim() || undefined,
                            })
                          }
                        />

                        <ActualMinutesEditor
                          estimatedMinutes={block.estimatedMinutes}
                          initialValue={block.actualMinutes}
                          isUpdating={isUpdating}
                          onSave={(value) =>
                            updateBlock(blockKey, {
                              actualMinutes: value,
                            })
                          }
                        />

                        <ErrorCategoriesEditor
                          selectedCategories={block.errorCategories ?? []}
                          isUpdating={isUpdating}
                          onToggleCategory={(category) => {
                            const currentCategories =
                              block.errorCategories ?? [];
                            const nextCategories = currentCategories.includes(
                              category,
                            )
                              ? currentCategories.filter(
                                  (item) => item !== category,
                                )
                              : [...currentCategories, category];

                            return updateBlock(blockKey, {
                              errorCategories: nextCategories,
                            });
                          }}
                        />

                        <BlockTextareaEditor
                          label="Dificultades observadas"
                          placeholder="Ej: Le costó usar los verbos irregulares en pasado y necesitó más apoyo para responder de forma espontánea..."
                          initialValue={block.studentDifficultiesText ?? ""}
                          isUpdating={isUpdating}
                          saveLabel="Guardar dificultades"
                          onSave={(value) =>
                            updateBlock(blockKey, {
                              studentDifficultiesText:
                                value.trim() || undefined,
                            })
                          }
                        />

                        <BlockTextareaEditor
                          label="Reflexión de la profesora"
                          placeholder="Ej: Funcionó bien, pero necesita más práctica oral antes de pasar al siguiente punto..."
                          initialValue={block.teacherReflection ?? ""}
                          isUpdating={isUpdating}
                          saveLabel="Guardar reflexión"
                          onSave={(value) =>
                            updateBlock(blockKey, {
                              teacherReflection: value.trim() || undefined,
                            })
                          }
                        />

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

                        {block.nextStepSuggestion && (
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl bg-gray-50 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Próximo paso
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {block.nextStepSuggestion}
                              </p>
                            </div>
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
