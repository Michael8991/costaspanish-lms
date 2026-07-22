"use client";

import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import { createClientId } from "@/components/dashboard/lessons/add/createClientId";
import {
  usePendingLessonBlocks,
} from "@/components/dashboard/lessons/add/usePendingLessonBlocks";
import type { PendingLessonBlock } from "@/components/dashboard/lessons/add/usePendingLessonBlocks";
import CustomModal from "@/components/ui/CustomModal";
import { LESSON_BLOCK_TYPES } from "@/lib/constants/lesson.constants";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";

import {
  AudioLines,
  Blocks,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  Gamepad2,
  GripVertical,
  Headphones,
  History,
  MessageCircle,
  Paperclip,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  useFormContext,
  useWatch,
} from "react-hook-form";

interface SecondStepAddLessonProps {
  blockFields: FieldArrayWithId<AddLessonFormValues, "blocks", "id">[];
  appendBlock: UseFieldArrayAppend<AddLessonFormValues, "blocks">;
  removeBlock: UseFieldArrayRemove;
  lessonId?: string;
}

type LessonFormBlock = AddLessonFormValues["blocks"][number];

interface BlockTypeVisual {
  label: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
}

function getBlockKey(block: LessonFormBlock, index: number, fieldId: string) {
  return block.lineageId ?? fieldId ?? `${index}-${block.title}`;
}

function formatBlockOrder(order: number) {
  return String(order + 1).padStart(2, "0");
}

function getBlockTypeVisual(type: string): BlockTypeVisual {
  switch (type) {
    case "warm_up":
      return {
        label: "Calentamiento",
        icon: Sparkles,
        className: "bg-amber-50 text-amber-700 ring-amber-100",
        iconClassName: "bg-amber-100 text-amber-700",
      };
    case "grammar":
      return {
        label: "Gramática",
        icon: BookOpen,
        className: "bg-blue-50 text-blue-700 ring-blue-100",
        iconClassName: "bg-blue-100 text-blue-700",
      };
    case "vocabulary":
      return {
        label: "Vocabulario",
        icon: Tags,
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        iconClassName: "bg-emerald-100 text-emerald-700",
      };
    case "speaking":
    case "roleplay":
    case "feedback":
      return {
        label:
          type === "roleplay"
            ? "Roleplay"
            : type === "feedback"
              ? "Feedback"
              : "Speaking",
        icon: MessageCircle,
        className: "bg-purple-50 text-purple-700 ring-purple-100",
        iconClassName: "bg-purple-100 text-purple-700",
      };
    case "listening":
      return {
        label: "Listening",
        icon: Headphones,
        className: "bg-indigo-50 text-indigo-700 ring-indigo-100",
        iconClassName: "bg-indigo-100 text-indigo-700",
      };
    case "reading":
    case "cultural_note":
      return {
        label: type === "cultural_note" ? "Nota cultural" : "Reading",
        icon: FileText,
        className: "bg-slate-50 text-slate-700 ring-slate-200",
        iconClassName: "bg-slate-100 text-slate-700",
      };
    case "writing":
    case "correction":
      return {
        label: type === "correction" ? "Corrección" : "Writing",
        icon: PencilLine,
        className: "bg-rose-50 text-rose-700 ring-rose-100",
        iconClassName: "bg-rose-100 text-rose-700",
      };
    case "review":
    case "homework_review":
    case "wrap_up":
      return {
        label:
          type === "homework_review"
            ? "Revisión de deberes"
            : type === "wrap_up"
              ? "Cierre"
              : "Repaso",
        icon: RotateCcw,
        className: "bg-cyan-50 text-cyan-700 ring-cyan-100",
        iconClassName: "bg-cyan-100 text-cyan-700",
      };
    case "assessment":
    case "exam_practice":
      return {
        label: type === "exam_practice" ? "Práctica de examen" : "Evaluación",
        icon: ClipboardCheck,
        className: "bg-orange-50 text-orange-700 ring-orange-100",
        iconClassName: "bg-orange-100 text-orange-700",
      };
    case "pronunciation":
      return {
        label: "Pronunciación",
        icon: AudioLines,
        className: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
        iconClassName: "bg-fuchsia-100 text-fuchsia-700",
      };
    case "game":
      return {
        label: "Juego",
        icon: Gamepad2,
        className: "bg-lime-50 text-lime-700 ring-lime-100",
        iconClassName: "bg-lime-100 text-lime-700",
      };
    case "custom":
      return {
        label: "Personalizado",
        icon: Blocks,
        className: "bg-gray-100 text-gray-700 ring-gray-200",
        iconClassName: "bg-gray-100 text-gray-600",
      };
    default:
      return {
        label: type ? formatLabel(type) : "Personalizado",
        icon: Blocks,
        className: "bg-gray-100 text-gray-700 ring-gray-200",
        iconClassName: "bg-gray-100 text-gray-600",
      };
  }
}

function getPendingBlockKey(pendingBlock: PendingLessonBlock) {
  return `${pendingBlock.sourceLessonId}-${
    pendingBlock.sourceBlockId ??
    pendingBlock.block.lineageId ??
    pendingBlock.block.title
  }`;
}

function buildBlockFromPendingBlock(
  pendingBlock: PendingLessonBlock,
  order: number,
): AddLessonFormValues["blocks"][number] {
  return {
    lineageId: pendingBlock.block.lineageId ?? createClientId(),
    order,
    title: pendingBlock.block.title,
    type: pendingBlock.block.type,
    cefrLevels: pendingBlock.block.cefrLevels ?? [],
    skills: pendingBlock.block.skills ?? [],
    tags: pendingBlock.block.tags ?? [],
    resources: pendingBlock.block.resources ?? [],
    plannedContent:
      pendingBlock.block.nextStepSuggestion ||
      pendingBlock.block.plannedContent ||
      "",
    estimatedMinutes: pendingBlock.block.estimatedMinutes ?? 10,
    plannedObjectives: pendingBlock.block.plannedObjectives ?? [],
    completionStatus: "not_completed",
    carryOverToNextLesson: false,
    actualContent: undefined,
    actualMinutes: undefined,
    achievedObjectives: [],
    blockSuccessRating: undefined,
    studentDifficultyLevel: undefined,
    engagementLevel: undefined,
    errorCategories: [],
    studentDifficultiesText: undefined,
    teacherReflection: undefined,
    nextStepSuggestion: undefined,
    origin: {
      sourceLessonId: pendingBlock.sourceLessonId,
      sourceBlockId: pendingBlock.sourceBlockId,
      sourceCourseId: pendingBlock.sourceCourseId,
      sourceStudentIds: pendingBlock.sourceStudentIds,
      sourceLessonTitle: pendingBlock.sourceLessonTitle,
      sourceLessonDate: pendingBlock.sourceLessonDate,
      sourceBlockTitle: pendingBlock.block.title,
    },
  };
}

function formatPendingLessonDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPendingReferenceDate(value?: string, timezone?: string) {
  if (!value || !timezone) return undefined;

  try {
    return zonedDateTimeToISOString(value, timezone);
  } catch {
    return undefined;
  }
}

export default function SecondStepAddLesson({
  blockFields,
  appendBlock,
  removeBlock,
  lessonId,
}: SecondStepAddLessonProps) {
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [expandedBlockKeys, setExpandedBlockKeys] = useState<Set<string>>(
    () => {
      if (blockFields.length !== 1) return new Set();

      const firstBlock = blockFields[0];
      return new Set([getBlockKey(firstBlock, 0, firstBlock.id)]);
    },
  );
  const knownBlockFieldIdsRef = useRef(
    new Set(blockFields.map((field) => field.id)),
  );
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();

  const attendees = useWatch({
    control,
    name: "attendees",
  });
  const scheduledStart = useWatch({
    control,
    name: "scheduledStart",
  });
  const timezone = useWatch({
    control,
    name: "timezone",
  });
  const courseId = useWatch({
    control,
    name: "courseId",
  });
  const blocks = useWatch({
    control,
    name: "blocks",
  });
  const uniqueSelectedStudentIds = useMemo(
    () =>
      Array.from(
        new Set(
          (attendees ?? [])
            .map((attendee) => attendee.studentId)
            .filter((studentId): studentId is string => Boolean(studentId)),
        ),
      ),
    [attendees],
  );
  const pendingReferenceDate = useMemo(
    () => getPendingReferenceDate(scheduledStart, timezone),
    [scheduledStart, timezone],
  );
  const {
    items: pendingBlocks,
    meta: pendingBlocksMeta,
    isLoading: isLoadingPendingBlocks,
    error: pendingBlocksError,
    refetch: refetchPendingBlocks,
  } = usePendingLessonBlocks({
    courseId,
    studentIds: uniqueSelectedStudentIds,
    excludeLessonId: lessonId,
    referenceDate: pendingReferenceDate,
    enabled: Boolean(courseId) || uniqueSelectedStudentIds.length > 0,
  });
  const addedPendingBlockKeys = useMemo(
    () =>
      new Set(
        (blocks ?? []).flatMap((block) => {
          if (!block.origin?.sourceLessonId) return [];

          return [
            `${block.origin.sourceLessonId}-${
              block.origin.sourceBlockId ??
              block.lineageId ??
              block.origin.sourceBlockTitle ??
              block.title
            }`,
          ];
        }),
      ),
    [blocks],
  );
  const hasPendingContext =
    Boolean(courseId) || uniqueSelectedStudentIds.length > 0;

  useEffect(() => {
    const newFields = blockFields.filter(
      (field) => !knownBlockFieldIdsRef.current.has(field.id),
    );

    if (newFields.length > 0) {
      setExpandedBlockKeys((current) => {
        const next = new Set(current);

        newFields.forEach((field) => {
          const index = blockFields.findIndex((item) => item.id === field.id);
          next.add(getBlockKey(field, index, field.id));
        });

        return next;
      });
    }

    knownBlockFieldIdsRef.current = new Set(
      blockFields.map((field) => field.id),
    );
  }, [blockFields]);

  function toggleExpandedBlock(blockKey: string) {
    setExpandedBlockKeys((current) => {
      const next = new Set(current);

      if (next.has(blockKey)) {
        next.delete(blockKey);
      } else {
        next.add(blockKey);
      }

      return next;
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Contenido de la lección
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Divide la clase en bloques para planificar qué se trabajará durante la
          sesión.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPendingModalOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-[#9e2727] hover:text-[#9e2727]"
        >
          <History className="h-4 w-4" />
          Pendientes anteriores
          {pendingBlocks.length > 0 ? ` (${pendingBlocks.length})` : ""}
        </button>
        {isLoadingPendingBlocks && (
          <span className="text-xs text-gray-500">Buscando pendientes...</span>
        )}
      </div>

      {pendingBlocks.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-800">
            {pendingBlocksMeta.previousLessonPendingCount > 0
              ? `Hay ${pendingBlocksMeta.previousLessonPendingCount} bloque(s) sin completar de la sesión anterior.`
              : "Hay pendientes anteriores relacionados."}
          </p>
          <button
            type="button"
            onClick={() => setIsPendingModalOpen(true)}
            className="shrink-0 cursor-pointer text-sm font-medium text-[#9e2727] underline underline-offset-2"
          >
            Ver pendientes
          </button>
        </div>
      )}

      <div className="space-y-4">
        {blockFields.map((field, index) => {
          const blockErrors = errors.blocks?.[index];
          const block = blocks?.[index] ?? field;
          const blockKey = getBlockKey(block, index, field.id);
          const isExpanded =
            expandedBlockKeys.has(blockKey) || Boolean(blockErrors);
          const blockTypeVisual = getBlockTypeVisual(block.type);
          const BlockIcon = blockTypeVisual.icon;
          const displayOrder = block.order ?? index;
          const resourceCount = block.resources?.length ?? 0;
          const cefrLevels = block.cefrLevels ?? [];
          const skills = block.skills ?? [];
          const panelId = `lesson-block-panel-${field.id}`;

          return (
            <article
              key={field.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                isExpanded
                  ? "border-[#9e2727]/30 ring-2 ring-[#9e2727]/5"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-stretch">
                <span
                  title="Ordenar próximamente"
                  className="flex w-9 shrink-0 cursor-default items-center justify-center border-r border-slate-100 text-slate-300 sm:w-10"
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>

                <button
                  type="button"
                  onClick={() => toggleExpandedBlock(blockKey)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-3 py-3 text-left sm:items-center sm:px-4"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold tracking-wider text-slate-400 sm:mt-0">
                    {formatBlockOrder(displayOrder)}
                  </span>

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${blockTypeVisual.iconClassName}`}
                  >
                    <BlockIcon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                        {block.title?.trim() || "Bloque sin título"}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${blockTypeVisual.className}`}
                      >
                        {blockTypeVisual.label}
                      </span>
                      {blockErrors && (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-100">
                          Revisar
                        </span>
                      )}
                    </span>

                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {typeof block.estimatedMinutes === "number" &&
                        !Number.isNaN(block.estimatedMinutes) && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {block.estimatedMinutes} min
                          </span>
                        )}
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {resourceCount} {resourceCount === 1 ? "recurso" : "recursos"}
                      </span>
                      {cefrLevels.slice(0, 2).map((level) => (
                        <span
                          key={level}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600"
                        >
                          {level}
                        </span>
                      ))}
                      {cefrLevels.length > 2 && (
                        <span className="font-medium text-slate-500">
                          +{cefrLevels.length - 2}
                        </span>
                      )}
                      {skills.slice(0, 2).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600"
                        >
                          {formatLabel(skill)}
                        </span>
                      ))}
                      {skills.length > 2 && (
                        <span className="font-medium text-slate-500">
                          +{skills.length - 2}
                        </span>
                      )}
                    </span>

                    <span className="mt-1.5 block truncate text-xs text-slate-500 sm:text-sm">
                      {block.plannedContent?.trim() ||
                        "Sin contenido planificado."}
                    </span>
                  </span>

                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform sm:mt-0 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {isExpanded && (
                <div
                  id={panelId}
                  className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`blocks-${field.id}-title`}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Título
                      </label>
                      <input
                        id={`blocks-${field.id}-title`}
                        {...register(`blocks.${index}.title` as const, {
                          required: "El título del bloque es obligatorio",
                        })}
                        className={`${inputClass(Boolean(blockErrors?.title))} mt-1.5 bg-white`}
                        placeholder="Título del bloque"
                      />
                      {blockErrors?.title && (
                        <p className="mt-1 text-xs text-red-600">
                          {blockErrors.title.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`blocks-${field.id}-type`}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Tipo
                      </label>
                      <select
                        id={`blocks-${field.id}-type`}
                        {...register(`blocks.${index}.type` as const, {
                          required: "Selecciona el tipo de bloque",
                        })}
                        className={`${inputClass(Boolean(blockErrors?.type))} mt-1.5 bg-white`}
                      >
                        {LESSON_BLOCK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {getBlockTypeVisual(type).label}
                          </option>
                        ))}
                      </select>
                      {blockErrors?.type && (
                        <p className="mt-1 text-xs text-red-600">
                          {blockErrors.type.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor={`blocks-${field.id}-content`}
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Contenido planificado
                    </label>
                    <textarea
                      id={`blocks-${field.id}-content`}
                      {...register(`blocks.${index}.plannedContent` as const, {
                        required: "El contenido planificado es obligatorio",
                      })}
                      className={`${inputClass(Boolean(blockErrors?.plannedContent))} mt-1.5 min-h-28 resize-y bg-white`}
                      placeholder="Describe qué se trabajará en este bloque"
                    />
                    {blockErrors?.plannedContent && (
                      <p className="mt-1 text-xs text-red-600">
                        {blockErrors.plannedContent.message}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`blocks-${field.id}-minutes`}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Minutos estimados
                      </label>
                      <div className="relative mt-1.5">
                        <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id={`blocks-${field.id}-minutes`}
                          type="number"
                          {...register(
                            `blocks.${index}.estimatedMinutes` as const,
                            {
                              valueAsNumber: true,
                              min: {
                                value: 0,
                                message: "Los minutos no pueden ser negativos",
                              },
                            },
                          )}
                          className={`${inputClass(Boolean(blockErrors?.estimatedMinutes))} bg-white pl-9`}
                          placeholder="10"
                        />
                      </div>
                      {blockErrors?.estimatedMinutes && (
                        <p className="mt-1 text-xs text-red-600">
                          {blockErrors.estimatedMinutes.message}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Material asociado
                      </span>
                      <span className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        {resourceCount} {resourceCount === 1 ? "recurso" : "recursos"}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        Añade materiales desde el toolbox de recursos.
                      </span>
                    </div>
                  </div>

                  {(cefrLevels.length > 0 ||
                    skills.length > 0 ||
                    (block.tags?.length ?? 0) > 0) && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                      {cefrLevels.map((level) => (
                        <span
                          key={level}
                          className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                        >
                          {level}
                        </span>
                      ))}
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                        >
                          {formatLabel(skill)}
                        </span>
                      ))}
                      {(block.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-inset ring-slate-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar bloque
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          appendBlock({
            lineageId: createClientId(),
            order: blockFields.length,
            title: "",
            type: "custom",
            cefrLevels: [],
            skills: [],
            tags: [],
            resources: [],
            plannedContent: "",
            estimatedMinutes: 10,
            errorCategories: [],
            completionStatus: "not_completed",
            carryOverToNextLesson: false,
          })
        }
        className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-[#9e2727] hover:text-[#9e2727]"
      >
        <Plus className="h-4 w-4" />
        Añadir bloque de contenido
      </button>

      <CustomModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        title="Pendientes anteriores"
        maxWidth="3xl"
      >
        <div className="max-h-[70vh] overflow-y-auto rounded-xl bg-gray-50 p-4 text-left text-gray-900">
          <p className="text-sm text-gray-600">
            Bloques de clases anteriores que quedaron pendientes o marcados
            para reutilizar.
          </p>

          {!hasPendingContext ? (
            <p className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">
              Selecciona alumnos para buscar pendientes anteriores.
            </p>
          ) : isLoadingPendingBlocks ? (
            <p className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">
              Buscando pendientes...
            </p>
          ) : pendingBlocksError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{pendingBlocksError}</p>
              <button
                type="button"
                onClick={refetchPendingBlocks}
                className="mt-2 cursor-pointer text-xs font-medium text-red-700 underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          ) : pendingBlocks.length === 0 ? (
            <p className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">
              No hay bloques pendientes relacionados.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingBlocks.map((pendingBlock) => {
                const pendingBlockKey = getPendingBlockKey(pendingBlock);
                const isAdded = addedPendingBlockKeys.has(pendingBlockKey);
                const formattedDate = formatPendingLessonDate(
                  pendingBlock.sourceLessonDate,
                );

                return (
                  <article
                    key={pendingBlockKey}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-gray-900">
                          {pendingBlock.block.title}
                        </h5>
                        <p className="mt-1 text-xs text-gray-500">
                          {pendingBlock.sourceLessonTitle}
                          {formattedDate ? ` · ${formattedDate}` : ""}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-[#9e2727]/10 px-2 py-1 text-[11px] font-medium text-[#9e2727]">
                          {pendingBlock.reason === "carry_over"
                            ? "Marcado para reutilizar"
                            : "No completado"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() =>
                          appendBlock(
                            buildBlockFromPendingBlock(
                              pendingBlock,
                              blockFields.length,
                            ),
                          )
                        }
                        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#9e2727] bg-white px-3 py-2 text-xs font-medium text-[#9e2727] transition hover:bg-[#9e2727]/5 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                      >
                        {isAdded ? "Añadido" : "Añadir a esta clase"}
                      </button>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                      {pendingBlock.block.plannedContent}
                    </p>

                    {pendingBlock.block.nextStepSuggestion && (
                      <p className="mt-2 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">
                          Siguiente paso sugerido:
                        </span>{" "}
                        {pendingBlock.block.nextStepSuggestion}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsPendingModalOpen(false)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Cerrar
            </button>
          </div>
        </div>
      </CustomModal>
    </section>
  );
}

function inputClass(hasError = false) {
  return `w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
    hasError
      ? "border-red-300 ring-2 ring-red-100"
      : "border-slate-200 focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
  }`;
}
