"use client";

import { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";

import { Plus } from "lucide-react";
import {
  FieldArrayWithId,
  useFieldArray,
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
  const { register } = useFormContext<AddLessonFormValues>();

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
        {blockFields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Bloque {index + 1}</span>

              <button
                type="button"
                onClick={() => removeBlock(index)}
                className="text-sm text-red-600"
              >
                Eliminar
              </button>
            </div>

            <input
              {...register(`blocks.${index}.title` as const)}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Título del bloque"
            />

            <select
              {...register(`blocks.${index}.type` as const)}
              className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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

            <textarea
              {...register(`blocks.${index}.plannedContent` as const)}
              className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Contenido planificado"
            />

            <input
              type="number"
              {...register(`blocks.${index}.estimatedMinutes` as const, {
                valueAsNumber: true,
              })}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Minutos estimados"
            />

            <div className="mt-3 text-xs text-slate-500">
              Recursos asociados: {field.resources?.length ?? 0}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          appendBlock({
            title: "",
            type: "warm_up",
            cefrLevels: [],
            skills: [],
            tags: [],
            resources: [],
            plannedContent: "",
            estimatedMinutes: 10,
            errorCategories: [],
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

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
