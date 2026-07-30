"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { z } from "zod";

import CourseTemplateBlocksEditor, {
  createEditableTemplateBlock,
  removeBlockClientIds,
  type EditableTemplateBlock,
} from "@/components/dashboard/courses/templates/CourseTemplateBlocksEditor";
import type { ResourceMap } from "@/lib/hooks/useResourcesByIds";
import { createCourseTemplateSchema } from "@/lib/validators/courseTemplate.validator";

type CourseTemplateFormInput = z.input<typeof createCourseTemplateSchema>;

export type CourseTemplateEditorModule = NonNullable<
  NonNullable<CourseTemplateFormInput["curriculum"]>["modules"]
>[number];

export type CourseTemplateEditorLesson = NonNullable<
  CourseTemplateEditorModule["lessons"]
>[number];

type CourseTemplateEditorBlock = NonNullable<
  CourseTemplateEditorLesson["blocks"]
>[number];

export type EditableTemplateLesson = Omit<
  CourseTemplateEditorLesson,
  "blocks"
> & {
  clientId: string;
  blocks: EditableTemplateBlock[];
};

export type EditableModuleData = Omit<
  CourseTemplateEditorModule,
  "lessons"
> & {
  clientId: string;
  lessons: EditableTemplateLesson[];
};

interface CourseTemplateLessonsEditorProps {
  modules: EditableModuleData[];
  moduleIndex: number;
  onChange: (nextModules: EditableModuleData[]) => void;
  resourceMap: ResourceMap;
  isResourcesLoading: boolean;
  resourcesError: string | null;
}

function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function toEditableBlock(
  block: CourseTemplateEditorBlock,
  clientId: string,
): EditableTemplateBlock {
  return createEditableTemplateBlock(
    {
      title: block.title,
      type: block.type,
      categories: block.categories ?? [],
      plannedContent: block.plannedContent,
      plannedObjectives: block.plannedObjectives ?? [],
      estimatedMinutes: block.estimatedMinutes,
      cefrLevels: block.cefrLevels ?? [],
      skills: block.skills ?? [],
      tags: block.tags ?? [],
      resources: block.resources ?? [],
      order: block.order ?? 0,
    },
    clientId,
  );
}

export function createEditableCourseTemplateModules(
  modules: CourseTemplateEditorModule[],
): EditableModuleData[] {
  return modules.map((module, moduleIndex) => ({
    ...module,
    clientId: `module-initial-${moduleIndex}`,
    lessons: (module.lessons ?? []).map((lesson, lessonIndex) => ({
      ...lesson,
      clientId: `lesson-initial-${moduleIndex}-${lessonIndex}`,
      objectives: lesson.objectives ?? [],
      blocks: (lesson.blocks ?? []).map((block, blockIndex) =>
        toEditableBlock(
          block,
          `block-initial-${moduleIndex}-${lessonIndex}-${blockIndex}`,
        ),
      ),
    })),
  }));
}

export function createEditableCourseTemplateModule(
  module: CourseTemplateEditorModule,
): EditableModuleData {
  return {
    ...module,
    clientId: createClientId("module"),
    lessons: (module.lessons ?? []).map((lesson) => ({
      ...lesson,
      clientId: createClientId("lesson"),
      objectives: lesson.objectives ?? [],
      blocks: (lesson.blocks ?? []).map((block) =>
        toEditableBlock(block, createClientId("block")),
      ),
    })),
  };
}

export function removeLessonClientIds(
  lessons: EditableTemplateLesson[],
): CourseTemplateEditorLesson[] {
  return lessons.map((lesson) => ({
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    estimatedMinutes: lesson.estimatedMinutes,
    objectives: lesson.objectives ?? [],
    blocks: removeBlockClientIds(lesson.blocks),
    teacherNotes: lesson.teacherNotes,
  }));
}

function normalizeLessonOrder(
  lessons: EditableTemplateLesson[],
): EditableTemplateLesson[] {
  return lessons.map((lesson, index) => ({
    ...lesson,
    order: index,
    objectives: lesson.objectives ?? [],
    blocks: lesson.blocks ?? [],
  }));
}

export default function CourseTemplateLessonsEditor({
  modules,
  moduleIndex,
  onChange,
  resourceMap,
  isResourcesLoading,
  resourcesError,
}: CourseTemplateLessonsEditorProps) {
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const currentModule = modules[moduleIndex];
  const lessons = currentModule?.lessons ?? [];

  if (!currentModule) return null;

  const updateLessons = (nextLessons: EditableTemplateLesson[]) => {
    const nextModules = modules.map((module, index) =>
      index === moduleIndex
        ? {
            ...module,
            lessons: normalizeLessonOrder(nextLessons),
          }
        : module,
    );

    onChange(nextModules);
  };

  const updateLesson = (
    lessonIndex: number,
    patch: Partial<EditableTemplateLesson>,
  ) => {
    updateLessons(
      lessons.map((lesson, index) =>
        index === lessonIndex ? { ...lesson, ...patch } : lesson,
      ),
    );
  };

  const addLesson = () => {
    const nextLesson: EditableTemplateLesson = {
      clientId: createClientId("lesson"),
      title: "Nueva clase modelo",
      description: "",
      order: lessons.length,
      estimatedMinutes: 60,
      objectives: [],
      blocks: [],
      teacherNotes: "",
    };

    updateLessons([...lessons, nextLesson]);
    setExpandedLessonId(nextLesson.clientId);
  };

  const removeLesson = (lessonIndex: number) => {
    if (!window.confirm("¿Eliminar esta clase modelo?")) return;

    updateLessons(lessons.filter((_, index) => index !== lessonIndex));
    setExpandedLessonId((currentId) =>
      currentId === lessons[lessonIndex]?.clientId ? null : currentId,
    );
  };

  const moveLesson = (lessonIndex: number, direction: -1 | 1) => {
    const targetIndex = lessonIndex + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const nextLessons = [...lessons];
    [nextLessons[lessonIndex], nextLessons[targetIndex]] = [
      nextLessons[targetIndex],
      nextLessons[lessonIndex],
    ];
    updateLessons(nextLessons);
  };

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h5 className="text-sm font-semibold text-slate-900">
            Clases modelo
          </h5>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Las clases modelo son sesiones sugeridas. No tienen alumnos ni
            fechas reales.
          </p>
        </div>
        <button
          type="button"
          onClick={addLesson}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          Añadir clase modelo
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-white/70 px-4 py-5 text-center">
          <p className="text-sm font-medium text-slate-700">
            Sin clases modelo todavía.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Añade una sesión sugerida para empezar a diseñar este módulo.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {lessons.map((lesson, lessonIndex) => {
            const isExpanded = expandedLessonId === lesson.clientId;
            const objectives = lesson.objectives ?? [];
            const blocks = lesson.blocks ?? [];
            const hasEmptyTitle = (lesson.title ?? "").trim().length === 0;
            const hasInvalidDuration =
              lesson.estimatedMinutes !== undefined &&
              lesson.estimatedMinutes < 0;
            const hasValidationError = hasEmptyTitle || hasInvalidDuration;

            return (
              <article
                key={lesson.clientId}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                  hasValidationError ? "border-red-300" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLessonId(isExpanded ? null : lesson.clientId)
                    }
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {String(lessonIndex + 1).padStart(2, "0")} ·{" "}
                      {lesson.title || "Clase modelo sin título"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {lesson.estimatedMinutes !== undefined
                        ? `${lesson.estimatedMinutes} min · `
                        : ""}
                      {objectives.length}{" "}
                      {objectives.length === 1 ? "objetivo" : "objetivos"} ·{" "}
                      {blocks.length}{" "}
                      {blocks.length === 1
                        ? "bloque modelo"
                        : "bloques modelo"}
                    </span>
                    {hasValidationError && (
                      <span className="mt-1 block text-xs font-medium text-red-600">
                        Revisa los campos indicados.
                      </span>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={lessonIndex === 0}
                      onClick={() => moveLesson(lessonIndex, -1)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Subir clase modelo ${lessonIndex + 1}`}
                      title="Subir"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={lessonIndex === lessons.length - 1}
                      onClick={() => moveLesson(lessonIndex, 1)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Bajar clase modelo ${lessonIndex + 1}`}
                      title="Bajar"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLessonId(isExpanded ? null : lesson.clientId)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {isExpanded ? "Cerrar" : "Editar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLesson(lessonIndex)}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                      aria-label={`Eliminar clase modelo ${lessonIndex + 1}`}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t border-slate-100 bg-slate-50/40 p-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Título de la clase modelo
                        </label>
                        <input
                          value={lesson.title ?? ""}
                          onChange={(event) =>
                            updateLesson(lessonIndex, {
                              title: event.target.value,
                            })
                          }
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#9e2727]/20 ${
                            hasEmptyTitle
                              ? "border-red-300 focus:border-red-400"
                              : "border-slate-200 focus:border-[#9e2727]"
                          }`}
                          placeholder="Ej. Saludos y presentaciones"
                        />
                        {hasEmptyTitle && (
                          <p className="mt-1 text-xs text-red-600">
                            El título de la clase modelo es obligatorio.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Duración
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={lesson.estimatedMinutes ?? ""}
                            onChange={(event) =>
                              updateLesson(lessonIndex, {
                                estimatedMinutes:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                            className={`w-full rounded-lg border px-3 py-2.5 pr-11 text-sm outline-none transition focus:ring-2 focus:ring-[#9e2727]/20 ${
                              hasInvalidDuration
                                ? "border-red-300"
                                : "border-slate-200 focus:border-[#9e2727]"
                            }`}
                            placeholder="60"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
                            min
                          </span>
                        </div>
                        {hasInvalidDuration && (
                          <p className="mt-1 text-xs text-red-600">
                            La duración no puede ser negativa.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Descripción
                      </label>
                      <textarea
                        rows={3}
                        value={lesson.description ?? ""}
                        onChange={(event) =>
                          updateLesson(lessonIndex, {
                            description: event.target.value,
                          })
                        }
                        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/20"
                        placeholder="Qué se trabaja en esta sesión"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <h6 className="text-sm font-medium text-slate-700">
                            Objetivos de la clase modelo
                          </h6>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Añade resultados observables para esta sesión
                            sugerida.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateLesson(lessonIndex, {
                              objectives: [...objectives, ""],
                            })
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Añadir objetivo
                        </button>
                      </div>

                      {objectives.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                          Esta clase modelo todavía no tiene objetivos.
                        </p>
                      ) : (
                        objectives.map((objective, objectiveIndex) => (
                          <div
                            key={`lesson-${lessonIndex}-objective-${objectiveIndex}`}
                            className="grid gap-2 sm:grid-cols-[1fr_auto]"
                          >
                            <input
                              value={objective}
                              onChange={(event) =>
                                updateLesson(lessonIndex, {
                                  objectives: objectives.map(
                                    (currentObjective, index) =>
                                      index === objectiveIndex
                                        ? event.target.value
                                        : currentObjective,
                                  ),
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/20"
                              placeholder="Ej. Presentarse usando llamarse y ser"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateLesson(lessonIndex, {
                                  objectives: objectives.filter(
                                    (_, index) => index !== objectiveIndex,
                                  ),
                                })
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2.5 text-red-600 transition hover:bg-red-50"
                              aria-label={`Eliminar objetivo ${objectiveIndex + 1} de la clase modelo`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Notas para la profesora
                      </label>
                      <textarea
                        rows={3}
                        value={lesson.teacherNotes ?? ""}
                        onChange={(event) =>
                          updateLesson(lessonIndex, {
                            teacherNotes: event.target.value,
                          })
                        }
                        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/20"
                        placeholder="Notas internas para preparar esta sesión"
                      />
                    </div>

                    <CourseTemplateBlocksEditor
                      blocks={blocks}
                      resourceMap={resourceMap}
                      isResourcesLoading={isResourcesLoading}
                      resourcesError={resourcesError}
                      onChange={(nextBlocks) =>
                        updateLesson(lessonIndex, { blocks: nextBlocks })
                      }
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
