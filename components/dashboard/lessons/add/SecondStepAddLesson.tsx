"use client";

import { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import {
  CEFR_LEVELS,
  LESSON_BLOCK_TYPES,
  LESSON_ERROR_CATEGORIES,
  LESSON_SKILLS,
} from "@/lib/constants/lesson.constants";
import { useLessonStudents } from "@/lib/hooks/useLessonStudents";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import LessonToolBox from "./LessonToolBox";

export default function SecondStepAddLesson() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "blocks",
  });

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
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                Bloque #{index + 1}
              </span>

              <button
                type="button"
                onClick={() => remove(index)}
                title="Eliminar bloque"
                className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Título del bloque
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calentamiento / Gramática"
                  {...register(`blocks.${index}.title` as const, {
                    required: "El título es obligatorio.",
                  })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                />
                {errors.blocks?.[index]?.title && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.blocks[index]?.title?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de bloque
                </label>
                <select
                  {...register(`blocks.${index}.type` as const, {
                    required: "El tipo de bloque es obligatorio.",
                  })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                >
                  {LESSON_BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
                {errors.blocks?.[index]?.type && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.blocks[index]?.type?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Minutos estimados
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="10"
                  {...register(`blocks.${index}.estimatedMinutes` as const, {
                    valueAsNumber: true,
                    min: {
                      value: 0,
                      message: "Los minutos no pueden ser negativos.",
                    },
                  })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                />
                {errors.blocks?.[index]?.estimatedMinutes && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.blocks[index]?.estimatedMinutes?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Ej: presente simple, conversación"
                  {...register(`blocks.${index}.tagsText` as never)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Contenido planificado
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe qué se trabajará en este bloque..."
                  {...register(`blocks.${index}.plannedContent` as const, {
                    required: "El contenido planificado es obligatorio.",
                  })}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                />
                {errors.blocks?.[index]?.plannedContent && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.blocks[index]?.plannedContent?.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Nivel CEFR
                </p>
                <div className="flex flex-wrap gap-2">
                  {CEFR_LEVELS.map((level) => (
                    <label
                      key={level}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                    >
                      <input
                        type="checkbox"
                        value={level}
                        {...register(`blocks.${index}.cefrLevels` as const)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Skills trabajadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {LESSON_SKILLS.map((skill) => (
                    <label
                      key={skill}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                    >
                      <input
                        type="checkbox"
                        value={skill}
                        {...register(`blocks.${index}.skills` as const)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
                      />
                      {formatLabel(skill)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Errores a observar
                </p>
                <div className="flex flex-wrap gap-2">
                  {LESSON_ERROR_CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                    >
                      <input
                        type="checkbox"
                        value={category}
                        {...register(
                          `blocks.${index}.errorCategories` as const,
                        )}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
                      />
                      {formatLabel(category)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          append({
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
