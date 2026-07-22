"use client";

import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import { createClientId } from "@/components/dashboard/lessons/add/createClientId";
import {
  usePendingLessonBlocks,
} from "@/components/dashboard/lessons/add/usePendingLessonBlocks";
import type { PendingLessonBlock } from "@/components/dashboard/lessons/add/usePendingLessonBlocks";
import CustomModal from "@/components/ui/CustomModal";
import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";

import { History, Plus } from "lucide-react";
import { useMemo, useState } from "react";
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

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Bloque {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => removeBlock(index)}
                  className="text-sm text-red-600"
                >
                  Eliminar
                </button>
              </div>

              <input
                {...register(`blocks.${index}.title` as const, {
                  required: "El título del bloque es obligatorio",
                })}
                className={inputClass(Boolean(blockErrors?.title))}
                placeholder="Título del bloque"
              />
              {blockErrors?.title && (
                <p className="mt-1 text-xs text-red-600">
                  {blockErrors.title.message}
                </p>
              )}

              <select
                {...register(`blocks.${index}.type` as const, {
                  required: "Selecciona el tipo de bloque",
                })}
                className={`${inputClass(Boolean(blockErrors?.type))} mt-3`}
              >
                <option value="custom">Custom</option>
                <option value="grammar">Grammar</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="speaking">Speaking</option>
                <option value="listening">Listening</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="pronunciation">Pronunciation</option>
              </select>
              {blockErrors?.type && (
                <p className="mt-1 text-xs text-red-600">
                  {blockErrors.type.message}
                </p>
              )}

              <textarea
                {...register(`blocks.${index}.plannedContent` as const, {
                  required: "El contenido planificado es obligatorio",
                })}
                className={`${inputClass(Boolean(blockErrors?.plannedContent))} mt-3 min-h-24`}
                placeholder="Contenido planificado"
              />
              {blockErrors?.plannedContent && (
                <p className="mt-1 text-xs text-red-600">
                  {blockErrors.plannedContent.message}
                </p>
              )}

              <input
                type="number"
                {...register(`blocks.${index}.estimatedMinutes` as const, {
                  valueAsNumber: true,
                  min: {
                    value: 0,
                    message: "Los minutos no pueden ser negativos",
                  },
                })}
                className={`${inputClass(Boolean(blockErrors?.estimatedMinutes))} mt-3`}
                placeholder="Minutos estimados"
              />
              {blockErrors?.estimatedMinutes && (
                <p className="mt-1 text-xs text-red-600">
                  {blockErrors.estimatedMinutes.message}
                </p>
              )}

              <div className="mt-3 text-xs text-slate-500">
                Recursos asociados: {blocks?.[index]?.resources?.length ?? 0}
              </div>
            </div>
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
