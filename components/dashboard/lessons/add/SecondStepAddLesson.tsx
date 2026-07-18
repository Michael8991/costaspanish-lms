"use client";

import { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";

import { Plus } from "lucide-react";
import {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  useFormContext,
} from "react-hook-form";

interface SecondStepAddLessonProps {
  blockFields: FieldArrayWithId<AddLessonFormValues, "blocks", "id">[];
  appendBlock: UseFieldArrayAppend<AddLessonFormValues, "blocks">;
  removeBlock: UseFieldArrayRemove;
}

export default function SecondStepAddLesson({
  blockFields,
  appendBlock,
  removeBlock,
}: SecondStepAddLessonProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();

  const blocks = watch("blocks") ?? [];

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
                Recursos asociados: {blocks[index]?.resources?.length ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          appendBlock({
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
