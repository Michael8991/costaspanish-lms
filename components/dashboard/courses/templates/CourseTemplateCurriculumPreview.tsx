import LessonBlockCategoryStack from "@/components/dashboard/lessons/LessonBlockCategoryStack";
import { BookOpenCheck, ChevronDown, Clock3, Paperclip } from "lucide-react";

import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import { normalizeBlockCategories } from "@/lib/utils/lesson-block-categories";
import { getLessonBlockTypeVisual } from "@/lib/utils/lesson-block-visuals";

interface CourseTemplateCurriculumPreviewProps {
  template: CourseTemplateDetailDTO;
}

export default function CourseTemplateCurriculumPreview({
  template,
}: CourseTemplateCurriculumPreviewProps) {
  const modules = [...template.curriculum.modules].sort(
    (first, second) => first.order - second.order,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Estructura del curso
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Las clases modelo son sesiones sugeridas que luego pueden servir
          para preparar clases reales.
        </p>
      </div>

      {modules.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <BookOpenCheck className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Esta plantilla todavía no tiene módulos.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Empieza añadiendo una estructura básica del curso.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {modules.map((module, moduleIndex) => {
            const lessons = [...module.lessons].sort(
              (first, second) => first.order - second.order,
            );
            const blocksCount = lessons.reduce(
              (total, lesson) => total + lesson.blocks.length,
              0,
            );

            return (
              <details
                key={`${module.order}-${module.title}-${moduleIndex}`}
                className="group rounded-2xl border border-slate-200 bg-slate-50/60"
                open={moduleIndex === 0}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#9e2727]">
                      Módulo {String(moduleIndex + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-900">
                      {module.title}
                    </h3>
                    {module.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {module.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {lessons.length} clases modelo · {blocksCount} bloques
                      modelo · {module.objectives.length} objetivos
                    </p>
                  </div>
                  <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>

                <div className="border-t border-slate-200 px-4 py-4">
                  {lessons.length === 0 ? (
                    <div>
                      <p className="text-sm text-slate-600">
                        Sin clases modelo todavía.
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Más adelante podrás usarlas para preparar clases
                        reales más rápido.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {lessons.map((lesson, lessonIndex) => {
                        const blocks = [...lesson.blocks].sort(
                          (first, second) => first.order - second.order,
                        );

                        return (
                          <li
                            key={`${lesson.order}-${lesson.title}-${lessonIndex}`}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                          >
                            <p className="text-sm font-medium text-slate-800">
                              {String(lessonIndex + 1).padStart(2, "0")} ·{" "}
                              {lesson.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {lesson.estimatedMinutes !== undefined
                                ? `${lesson.estimatedMinutes} min · `
                                : ""}
                              {lesson.objectives.length}{" "}
                              {lesson.objectives.length === 1
                                ? "objetivo"
                                : "objetivos"}{" "}
                              · {blocks.length}{" "}
                              {blocks.length === 1
                                ? "bloque modelo"
                                : "bloques modelo"}
                            </p>

                            {blocks.length === 0 ? (
                              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                                Sin bloques modelo todavía.
                              </p>
                            ) : (
                              <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                {blocks.map((block, blockIndex) => {
                                  const type = block.type || "custom";
                                  const visual =
                                    getLessonBlockTypeVisual(type);
                                  const categories = normalizeBlockCategories(
                                    type,
                                    block.categories,
                                  );
                                  const resourcesCount =
                                    block.resources.length;

                                  return (
                                    <li
                                      key={`${block.order}-${block.title}-${blockIndex}`}
                                      className="flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div className="flex min-w-0 items-start gap-2.5">
                                        <span className="shrink-0 font-mono text-[10px] font-semibold text-slate-400">
                                          {String(blockIndex + 1).padStart(
                                            2,
                                            "0",
                                          )}
                                        </span>
                                        <div className="min-w-0">
                                          <LessonBlockCategoryStack
                                            categories={categories}
                                          />
                                          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                            {block.title}
                                          </p>
                                          <p className="mt-0.5 text-[11px] text-slate-400">
                                            {visual.label}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                        {block.estimatedMinutes !==
                                          undefined && (
                                          <span className="inline-flex items-center gap-1">
                                            <Clock3 className="h-3 w-3" />
                                            {block.estimatedMinutes} min
                                          </span>
                                        )}
                                        {resourcesCount > 0 && (
                                          <span className="inline-flex items-center gap-1">
                                            <Paperclip className="h-3 w-3" />
                                            {resourcesCount}{" "}
                                            {resourcesCount === 1
                                              ? "recurso"
                                              : "recursos"}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {module.submodules.length > 0 && (
                    <p className="mt-3 text-xs text-slate-400">
                      Estructura legacy: {module.submodules.length} submódulos
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {template.stats.resourcesCount === 0 && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          No hay recursos sugeridos todavía.
        </p>
      )}
    </section>
  );
}
