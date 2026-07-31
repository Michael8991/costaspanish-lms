"use client";

import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import CreateLessonFromCourseModal from "@/components/dashboard/courses/CreateLessonFromCourseModal";
import type { CourseProfileDetailDTO } from "@/lib/dto/course-profile.dto";
import type {
  CourseTemplateDetailDTO,
  ModuleDataDTO,
  TemplateLessonDTO,
} from "@/lib/dto/course-template.dto";
import type { LessonListDTO } from "@/lib/dto/lesson.dto";

type SelectedTemplateLesson = {
  module: ModuleDataDTO;
  lesson: TemplateLessonDTO;
};

type CourseProfileTemplatePlanProps = {
  course: CourseProfileDetailDTO;
  template: CourseTemplateDetailDTO;
  createdLessons: LessonListDTO[];
  locale: string;
};

export default function CourseProfileTemplatePlan({
  course,
  template,
  createdLessons,
  locale,
}: CourseProfileTemplatePlanProps) {
  const [selected, setSelected] = useState<SelectedTemplateLesson | null>(
    null,
  );
  const modules = [...template.curriculum.modules].sort(
    (first, second) => first.order - second.order,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Plan del curso
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Este es el plan previsto de la plantilla. Elige una clase modelo para
          programar una clase real con sus bloques y recursos sugeridos.
        </p>
      </div>

      {modules.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Esta plantilla todavía no tiene clases modelo.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {modules.map((module, moduleIndex) => {
            const lessons = [...module.lessons].sort(
              (first, second) => first.order - second.order,
            );

            return (
              <details
                key={`${module.order}-${module.title}-${moduleIndex}`}
                open={moduleIndex === 0}
                className="group rounded-2xl border border-slate-200 bg-slate-50/60"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#9e2727]">
                      Módulo {String(moduleIndex + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-900">
                      {module.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {lessons.length} clases modelo
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                </summary>

                <div className="space-y-2 border-t border-slate-200 p-3">
                  {lessons.map((lesson, lessonIndex) => {
                    const blocksDuration = lesson.blocks.reduce(
                      (total, block) =>
                        total + (block.estimatedMinutes ?? 0),
                      0,
                    );
                    const estimatedDuration =
                      lesson.estimatedMinutes !== undefined &&
                      lesson.estimatedMinutes > 0
                        ? lesson.estimatedMinutes
                        : blocksDuration > 0
                          ? blocksDuration
                          : 60;
                    const resourcesCount = new Set(
                      lesson.blocks.flatMap((block) => block.resources),
                    ).size;
                    const lessonsCreatedFromThisModel = createdLessons.filter(
                      (createdLesson) =>
                        createdLesson.sourceTemplateLesson?.moduleOrder ===
                          module.order &&
                        createdLesson.sourceTemplateLesson?.lessonOrder ===
                          lesson.order,
                    );

                    return (
                      <article
                        key={`${lesson.order}-${lesson.title}-${lessonIndex}`}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {String(lessonIndex + 1).padStart(2, "0")} ·{" "}
                              {lesson.title}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {estimatedDuration} min
                              </span>
                              <span>{lesson.objectives.length} objetivos</span>
                              <span>{lesson.blocks.length} bloques</span>
                              <span className="inline-flex items-center gap-1">
                                <Paperclip className="h-3.5 w-3.5" />
                                {resourcesCount} recursos
                              </span>
                            </div>

                            {lessonsCreatedFromThisModel.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ya hay una clase creada desde esta sesión.
                                <Link
                                  href={`/${locale}/dashboard/lessons/${lessonsCreatedFromThisModel[0].id}`}
                                  className="inline-flex items-center gap-1 font-semibold underline"
                                >
                                  Ver clase
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelected({ module, lesson })}
                            disabled={course.status === "archived"}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-3 py-2 text-sm font-medium text-white hover:bg-[#8d2121] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CalendarPlus className="h-4 w-4" />
                            Crear clase
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {selected && (
        <CreateLessonFromCourseModal
          isOpen
          onClose={() => setSelected(null)}
          courseProfile={course}
          templateModule={selected.module}
          templateLesson={selected.lesson}
          locale={locale}
        />
      )}
    </section>
  );
}
