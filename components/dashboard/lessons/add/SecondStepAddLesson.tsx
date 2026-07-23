"use client";

import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import { createClientId } from "@/components/dashboard/lessons/add/createClientId";
import ResourceSelector from "@/components/dashboard/lessons/add/ResourceSelector";
import { usePendingLessonBlocks } from "@/components/dashboard/lessons/add/usePendingLessonBlocks";
import type { PendingLessonBlock } from "@/components/dashboard/lessons/add/usePendingLessonBlocks";
import CustomModal from "@/components/ui/CustomModal";
import { LESSON_BLOCK_TYPES } from "@/lib/constants/lesson.constants";
import type { ResourceListItemDTO } from "@/lib/dto/resource.dto";
import type { LessonBlockType } from "@/lib/types/lesson";
import {
  getSecondaryLessonBlockCategories,
  normalizeLessonBlockCategories,
} from "@/lib/utils/lesson-block-categories";
import { getLessonBlockTypeVisual } from "@/lib/utils/lesson-block-visuals";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ArchiveRestore,
  Ban,
  Check,
  ChevronDown,
  Clock3,
  GripVertical,
  Paperclip,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayMove,
  UseFieldArrayRemove,
  useFormContext,
  useWatch,
} from "react-hook-form";

interface SecondStepAddLessonProps {
  locale: string;
  blockFields: FieldArrayWithId<AddLessonFormValues, "blocks", "id">[];
  appendBlock: UseFieldArrayAppend<AddLessonFormValues, "blocks">;
  removeBlock: UseFieldArrayRemove;
  moveBlock: UseFieldArrayMove;
  lessonId?: string;
}

type LessonFormBlock = AddLessonFormValues["blocks"][number];

interface SortableLessonBlockCardProps {
  id: string;
  isExpanded: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
}

function SortableLessonBlockCard({
  id,
  isExpanded,
  children,
}: SortableLessonBlockCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onClick={(event) => event.stopPropagation()}
      aria-label="Reordenar bloque"
      title="Arrastra para reordenar"
      className="flex w-10 shrink-0 touch-none cursor-grab items-center justify-center border-r border-slate-100 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing sm:w-11"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        isDragging
          ? "relative z-10 border-[#9e2727]/30 opacity-70 shadow-lg ring-2 ring-[#9e2727]/20"
          : isExpanded
            ? "border-[#9e2727]/30 shadow-sm ring-2 ring-[#9e2727]/5"
            : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {children(dragHandle)}
    </article>
  );
}

function getBlockKey(block: LessonFormBlock, index: number, fieldId: string) {
  return block.lineageId ?? fieldId ?? `${index}-${block.title}`;
}

function formatBlockOrder(order: number) {
  return String(order + 1).padStart(2, "0");
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
    categories: normalizeLessonBlockCategories(
      pendingBlock.block.type,
      pendingBlock.block.categories,
    ),
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

function getPendingCompletionStatusVisual(status: string) {
  switch (status) {
    case "completed":
      return {
        label: "Completado",
        className:
          "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20",
      };
    case "partially_completed":
      return {
        label: "Parcial",
        className: "bg-amber-500/10 text-amber-200 ring-amber-400/20",
      };
    case "skipped":
      return {
        label: "Descartado",
        className: "bg-slate-500/10 text-slate-300 ring-slate-400/20",
      };
    case "not_completed":
    default:
      return {
        label: "No completado",
        className: "bg-rose-500/10 text-rose-200 ring-rose-400/20",
      };
  }
}

export default function SecondStepAddLesson({
  locale,
  blockFields,
  appendBlock,
  removeBlock,
  moveBlock,
  lessonId,
}: SecondStepAddLessonProps) {
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [resourceBlockFieldId, setResourceBlockFieldId] = useState<
    string | null
  >(null);
  const [discardingBlockKey, setDiscardingBlockKey] = useState<string | null>(
    null,
  );
  const [discardPendingBlockError, setDiscardPendingBlockError] = useState<
    string | null
  >(null);
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
    getValues,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
  const lessonResourceIds = useMemo(
    () =>
      Array.from(
        new Set((blocks ?? []).flatMap((block) => block.resources ?? [])),
      ),
    [blocks],
  );
  const resourceBlockIndex = resourceBlockFieldId
    ? blockFields.findIndex((field) => field.id === resourceBlockFieldId)
    : -1;
  const currentBlockResourceIds =
    resourceBlockIndex >= 0
      ? (blocks?.[resourceBlockIndex]?.resources ?? [])
      : [];
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
  const sortableItems = useMemo(
    () => blockFields.map((field) => field.id),
    [blockFields],
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = blockFields.findIndex((field) => field.id === active.id);
    const newIndex = blockFields.findIndex((field) => field.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedBlocks = arrayMove(getValues("blocks"), oldIndex, newIndex);

    moveBlock(oldIndex, newIndex);
    reorderedBlocks.forEach((_, index) => {
      setValue(`blocks.${index}.order`, index, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  }

  function toggleBlockCategory(
    index: number,
    category: LessonBlockType,
    block: LessonFormBlock,
  ) {
    const currentCategories = normalizeLessonBlockCategories(
      block.type,
      block.categories,
    );
    const isSelected = currentCategories.includes(category);
    let nextType = block.type;
    let nextCategories: LessonBlockType[];

    if (!isSelected) {
      nextCategories = [...currentCategories, category];
    } else {
      nextCategories = currentCategories.filter(
        (currentCategory) => currentCategory !== category,
      );

      if (category === block.type) {
        nextType = nextCategories[0] ?? "custom";
      }

      nextCategories =
        nextCategories.length > 0
          ? normalizeLessonBlockCategories(nextType, nextCategories)
          : ["custom"];
    }

    setValue(`blocks.${index}.type`, nextType, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`blocks.${index}.categories`, nextCategories, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function addResourcesToBlock(resources: ResourceListItemDTO[]) {
    if (resourceBlockIndex < 0) return;

    const currentResources =
      getValues(`blocks.${resourceBlockIndex}.resources`) ?? [];
    const nextResources = Array.from(
      new Set([
        ...currentResources,
        ...resources.map((resource) => resource.id),
      ]),
    );

    setValue(`blocks.${resourceBlockIndex}.resources`, nextResources, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function handleDiscardPendingBlock(
    pendingBlock: PendingLessonBlock,
  ) {
    const confirmed = window.confirm(
      "Este bloque dejará de aparecer como pendiente. No se borrará del historial. ¿Quieres descartarlo?",
    );

    if (!confirmed) return;

    const pendingBlockKey = getPendingBlockKey(pendingBlock);

    try {
      setDiscardingBlockKey(pendingBlockKey);
      setDiscardPendingBlockError(null);

      const response = await fetch(
        "/api/lessons/pending-blocks/discard",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceLessonId: pendingBlock.sourceLessonId,
            sourceBlockId: pendingBlock.sourceBlockId,
            lineageId: pendingBlock.block.lineageId,
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error("Pending block discard failed");
      }

      refetchPendingBlocks();
    } catch {
      setDiscardPendingBlockError(
        "No se pudo descartar el bloque pendiente.",
      );
    } finally {
      setDiscardingBlockKey(null);
    }
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {blockFields.map((field, index) => {
              const blockErrors = errors.blocks?.[index];
              const block = blocks?.[index] ?? field;
              const blockKey = getBlockKey(block, index, field.id);
              const isExpanded =
                expandedBlockKeys.has(blockKey) || Boolean(blockErrors);
              const blockTypeVisual = getLessonBlockTypeVisual(block.type);
              const BlockIcon = blockTypeVisual.icon;
              const blockCategories = normalizeLessonBlockCategories(
                block.type,
                block.categories,
              );
              const secondaryCategories =
                getSecondaryLessonBlockCategories(
                  block.type,
                  blockCategories,
                );
              const displayOrder = index;
              const resourceCount = block.resources?.length ?? 0;
              const cefrLevels = block.cefrLevels ?? [];
              const skills = block.skills ?? [];
              const panelId = `lesson-block-panel-${field.id}`;

              return (
                <SortableLessonBlockCard
                  key={field.id}
                  id={field.id}
                  isExpanded={isExpanded}
                >
                  {(dragHandle) => (
                    <>
                      <div className="flex items-stretch">
                        {dragHandle}

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
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${blockTypeVisual.badgeClassName}`}
                              >
                                {blockTypeVisual.label}
                              </span>
                              {secondaryCategories
                                .slice(0, 2)
                                .map((category) => (
                                  <span
                                    key={`${blockKey}-${category}`}
                                    className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                                  >
                                    {
                                      getLessonBlockTypeVisual(category)
                                        .label
                                    }
                                  </span>
                                ))}
                              {secondaryCategories.length > 2 && (
                                <span className="text-[10px] font-medium text-slate-500">
                                  +{secondaryCategories.length - 2}
                                </span>
                              )}
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
                                {resourceCount}{" "}
                                {resourceCount === 1 ? "recurso" : "recursos"}
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
                                  required:
                                    "El título del bloque es obligatorio",
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
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Categorías
                              </span>
                              <input
                                type="hidden"
                                {...register(`blocks.${index}.type` as const, {
                                  required: "Selecciona el tipo de bloque",
                                })}
                              />
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                {LESSON_BLOCK_TYPES.map((category) => {
                                  const visual =
                                    getLessonBlockTypeVisual(category);
                                  const isSelected =
                                    blockCategories.includes(category);
                                  const isPrimary = block.type === category;

                                  return (
                                    <button
                                      key={category}
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() =>
                                        toggleBlockCategory(
                                          index,
                                          category,
                                          block,
                                        )
                                      }
                                      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                                        isSelected
                                          ? `${visual.badgeClassName} border-transparent ring-1 ring-inset`
                                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      {visual.label}
                                      {isPrimary && (
                                        <>
                                          <Star className="h-3 w-3 fill-current" />
                                          <span className="sr-only">
                                            Principal
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="mt-2 text-[11px] text-slate-400">
                                La categoría con estrella define el color y el
                                icono principal.
                              </p>
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
                              {...register(
                                `blocks.${index}.plannedContent` as const,
                                {
                                  required:
                                    "El contenido planificado es obligatorio",
                                },
                              )}
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
                                        message:
                                          "Los minutos no pueden ser negativos",
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
                                {resourceCount}{" "}
                                {resourceCount === 1 ? "recurso" : "recursos"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setResourceBlockFieldId(field.id)
                                }
                                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#9e2727]/30 hover:bg-[#9e2727]/5 hover:text-[#9e2727]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Añadir recursos
                              </button>
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
                    </>
                  )}
                </SortableLessonBlockCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() =>
          appendBlock({
            lineageId: createClientId(),
            order: blockFields.length,
            title: "",
            type: "custom",
            categories: ["custom"],
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
        isOpen={resourceBlockFieldId !== null}
        onClose={() => setResourceBlockFieldId(null)}
        title="Añadir recursos al bloque"
        maxWidth="5xl"
      >
        <div className="p-4">
          <ResourceSelector
            locale={locale}
            onConfirmResources={addResourcesToBlock}
            confirmAction="add_to_block"
            currentBlockResourceIds={currentBlockResourceIds}
            lessonResourceIds={lessonResourceIds}
            studentIds={uniqueSelectedStudentIds}
            beforeDate={pendingReferenceDate}
            currentLessonId={lessonId}
            onClose={() => setResourceBlockFieldId(null)}
          />
        </div>
      </CustomModal>

      <CustomModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        title="Pendientes anteriores"
        maxWidth="4xl"
      >
        <div className="flex w-full flex-col pt-3 text-left">
          <p className="text-sm text-white/45">
            Bloques sin completar de clases anteriores que puedes recuperar o
            descartar.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#9e2727]/20">
              <ArchiveRestore className="h-4 w-4 text-red-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-white/40">
                Bloques pendientes
              </p>
              <p className="mt-0.5 text-sm font-medium text-white">
                Selecciona contenido para recuperar en esta clase
              </p>
            </div>
          </div>

          {discardPendingBlockError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200"
            >
              {discardPendingBlockError}
            </p>
          )}

          <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1 sm:pr-2">
            {!hasPendingContext ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center">
                <ArchiveRestore className="h-7 w-7 text-white/20" />
                <p className="mt-3 text-sm font-medium text-white/70">
                  Selecciona alumnos
                </p>
                <p className="mt-1 max-w-md text-xs leading-5 text-white/40">
                  Selecciona los alumnos de la clase para buscar sus bloques
                  pendientes anteriores.
                </p>
              </div>
            ) : isLoadingPendingBlocks ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-sm text-white/45">
                <Clock3 className="h-4 w-4 animate-pulse" />
                Buscando pendientes...
              </div>
            ) : pendingBlocksError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-sm text-rose-200">{pendingBlocksError}</p>
                <button
                  type="button"
                  onClick={refetchPendingBlocks}
                  className="mt-3 cursor-pointer rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-400/20"
                >
                  Reintentar
                </button>
              </div>
            ) : pendingBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center">
                <ArchiveRestore className="h-8 w-8 text-white/20" />
                <p className="mt-3 text-sm font-medium text-white/70">
                  No hay bloques pendientes
                </p>
                <p className="mt-1 max-w-md text-xs leading-5 text-white/40">
                  Cuando una clase tenga bloques sin completar, aparecerán aquí
                  para poder recuperarlos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBlocks.map((pendingBlock) => {
                  const pendingBlockKey = getPendingBlockKey(pendingBlock);
                  const isAdded = addedPendingBlockKeys.has(pendingBlockKey);
                  const isDiscarding =
                    discardingBlockKey === pendingBlockKey;
                  const formattedDate = formatPendingLessonDate(
                    pendingBlock.sourceLessonDate,
                  );
                  const blockTypeVisual = getLessonBlockTypeVisual(
                    pendingBlock.block.type,
                  );
                  const secondaryCategories =
                    getSecondaryLessonBlockCategories(
                      pendingBlock.block.type,
                      pendingBlock.block.categories,
                    );
                  const PendingBlockIcon = blockTypeVisual.icon;
                  const completionStatusVisual =
                    getPendingCompletionStatusVisual(
                      pendingBlock.block.completionStatus,
                    );

                  return (
                    <article
                      key={pendingBlockKey}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10 ${blockTypeVisual.iconClassName}`}
                          >
                            <PendingBlockIcon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="text-sm font-semibold text-white">
                                {pendingBlock.block.title}
                              </h5>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${blockTypeVisual.badgeClassName}`}
                              >
                                {blockTypeVisual.label}
                              </span>
                              {secondaryCategories
                                .slice(0, 2)
                                .map((category) => (
                                  <span
                                    key={`${pendingBlockKey}-${category}`}
                                    className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/55 ring-1 ring-inset ring-white/10"
                                  >
                                    {
                                      getLessonBlockTypeVisual(category)
                                        .label
                                    }
                                  </span>
                                ))}
                              {secondaryCategories.length > 2 && (
                                <span className="text-[10px] font-medium text-white/40">
                                  +{secondaryCategories.length - 2}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs text-white/40">
                              {pendingBlock.sourceLessonTitle}
                              {formattedDate ? ` · ${formattedDate}` : ""}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${completionStatusVisual.className}`}
                              >
                                {completionStatusVisual.label}
                              </span>
                              {pendingBlock.reason === "carry_over" && (
                                <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-inset ring-amber-400/20">
                                  Marcado para reutilizar
                                </span>
                              )}
                            </div>

                            <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/65">
                              {pendingBlock.block.plannedContent ||
                                "Sin contenido planificado."}
                            </p>

                            {pendingBlock.block.nextStepSuggestion && (
                              <p className="mt-2 border-l border-white/10 pl-3 text-xs leading-5 text-white/45">
                                <span className="font-medium text-white/60">
                                  Siguiente paso sugerido:
                                </span>{" "}
                                {pendingBlock.block.nextStepSuggestion}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-col">
                          <button
                            type="button"
                            disabled={isAdded || isDiscarding}
                            onClick={() =>
                              appendBlock(
                                buildBlockFromPendingBlock(
                                  pendingBlock,
                                  blockFields.length,
                                ),
                              )
                            }
                            className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/80 transition-all hover:border-[#9e2727]/40 hover:bg-[#9e2727] hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-white/30 sm:flex-none"
                          >
                            {isAdded ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            {isAdded ? "Añadido" : "Añadir a esta clase"}
                          </button>

                          {!isAdded && (
                            <button
                              type="button"
                              disabled={isDiscarding}
                              onClick={() =>
                                void handleDiscardPendingBlock(pendingBlock)
                              }
                              title="Lo marca como saltado y dejará de aparecer como pendiente."
                              className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              {isDiscarding ? "Descartando..." : "Descartar"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setIsPendingModalOpen(false)}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-all hover:bg-white/10 hover:text-white/80"
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
