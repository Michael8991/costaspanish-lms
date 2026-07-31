"use client";

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import type { z } from "zod";

import {
  COURSE_TEMPLATE_FREQUENCIES,
  CREDIT_CONSUME_ON_VALUES,
  PARTICIPANT_MODES,
  type ParticipantMode,
} from "@/lib/constants/courseTemplate.constants";
import { LESSON_CLASS_TYPES } from "@/lib/constants/lesson.constants";
import {
  getClassTypeLabel,
  getCreditConsumeOnLabel,
  getFrequencyLabel,
  getParticipantModeLabel,
  getPreparationStatusLabel,
  getWeekdayLabel,
} from "@/lib/utils/course-template-visuals";
import { createCourseTemplateSchema } from "@/lib/validators/courseTemplate.validator";

type CourseTemplateFormValues = z.input<typeof createCourseTemplateSchema>;

interface CourseTemplateOperationalDefaultsFieldsProps {
  control: Control<CourseTemplateFormValues>;
  register: UseFormRegister<CourseTemplateFormValues>;
  setValue: UseFormSetValue<CourseTemplateFormValues>;
  errors: FieldErrors<CourseTemplateFormValues>;
}

const numberInputTransform = {
  setValueAs: (value: string) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export default function CourseTemplateOperationalDefaultsFields({
  control,
  register,
  setValue,
  errors,
}: CourseTemplateOperationalDefaultsFieldsProps) {
  const preferredWeekdays =
    useWatch({
      control,
      name: "operationalDefaults.schedulingDefaults.preferredWeekdays",
    }) ?? [];
  const participantMode =
    useWatch({
      control,
      name: "operationalDefaults.participantPolicy.participantMode",
    }) ?? "solo";

  const applyParticipantMode = (mode: ParticipantMode) => {
    const participantCounts: Record<
      Exclude<ParticipantMode, "group">,
      number
    > = {
      solo: 1,
      pair: 2,
      trio: 3,
    };
    const exactCount =
      mode === "group" ? undefined : participantCounts[mode];

    setValue("operationalDefaults.participantPolicy.participantMode", mode, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      "operationalDefaults.participantPolicy.minStudents",
      exactCount ?? 2,
      { shouldDirty: true, shouldValidate: true },
    );
    setValue(
      "operationalDefaults.participantPolicy.maxStudents",
      exactCount ?? 6,
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Clases</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Duración por defecto de la clase
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                {...register(
                  "operationalDefaults.lessonDefaults.durationMinutes",
                  numberInputTransform,
                )}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
                min
              </span>
            </div>
            <FieldError
              message={
                errors.operationalDefaults?.lessonDefaults?.durationMinutes
                  ?.message
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Zona horaria
            </label>
            <input
              {...register("operationalDefaults.lessonDefaults.timezone")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
              placeholder="Europe/Madrid"
            />
            <FieldError
              message={
                errors.operationalDefaults?.lessonDefaults?.timezone?.message
              }
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tipo de clase por defecto
            </label>
            <select
              {...register(
                "operationalDefaults.lessonDefaults.defaultClassType",
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            >
              {LESSON_CLASS_TYPES.map((classType) => (
                <option key={classType} value={classType}>
                  {getClassTypeLabel(classType)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Frecuencia</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Frecuencia recomendada
            </label>
            <select
              {...register(
                "operationalDefaults.schedulingDefaults.frequency",
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            >
              {COURSE_TEMPLATE_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {getFrequencyLabel(frequency)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Sesiones por semana
            </label>
            <input
              type="number"
              min={1}
              {...register(
                "operationalDefaults.schedulingDefaults.sessionsPerWeek",
                numberInputTransform,
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
            />
            <FieldError
              message={
                errors.operationalDefaults?.schedulingDefaults?.sessionsPerWeek
                  ?.message
              }
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            {...register(
              "operationalDefaults.schedulingDefaults.allowRecurringLessons",
            )}
            className="rounded border-slate-300 text-[#9e2727] focus:ring-[#9e2727]"
          />
          Permitir clases recurrentes
        </label>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">Días preferidos</p>
          <p className="mt-0.5 text-xs text-slate-500">
            La semana se muestra de lunes a domingo.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
              const isSelected = preferredWeekdays.includes(weekday);
              return (
                <label
                  key={weekday}
                  className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "border-[#9e2727]/40 bg-[#9e2727]/10 text-[#9e2727]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() =>
                      setValue(
                        "operationalDefaults.schedulingDefaults.preferredWeekdays",
                        isSelected
                          ? preferredWeekdays.filter(
                              (value) => value !== weekday,
                            )
                          : [...preferredWeekdays, weekday],
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                    className="sr-only"
                  />
                  {getWeekdayLabel(weekday)}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Créditos</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Créditos por clase
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              {...register(
                "operationalDefaults.creditPolicy.creditsPerLesson",
                numberInputTransform,
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
            />
            <FieldError
              message={
                errors.operationalDefaults?.creditPolicy?.creditsPerLesson
                  ?.message
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Consumir crédito al
            </label>
            <select
              {...register("operationalDefaults.creditPolicy.consumeOn")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            >
              {CREDIT_CONSUME_ON_VALUES.map((consumeOn) => (
                <option key={consumeOn} value={consumeOn}>
                  {getCreditConsumeOnLabel(consumeOn)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            {
              name: "operationalDefaults.creditPolicy.trialConsumesCredit" as const,
              label: "Trial consume crédito",
            },
            {
              name: "operationalDefaults.creditPolicy.cancellationConsumesCredit" as const,
              label: "Cancelación consume crédito",
            },
            {
              name: "operationalDefaults.creditPolicy.noShowConsumesCredit" as const,
              label: "No-show consume crédito",
            },
          ].map((option) => (
            <label
              key={option.name}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700"
            >
              <input
                type="checkbox"
                {...register(option.name)}
                className="rounded border-slate-300 text-[#9e2727] focus:ring-[#9e2727]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Participantes</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Modo
            </label>
            <select
              value={participantMode}
              onChange={(event) =>
                applyParticipantMode(event.target.value as ParticipantMode)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            >
              {PARTICIPANT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {getParticipantModeLabel(mode)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Mínimo de alumnos
            </label>
            <input
              type="number"
              min={1}
              {...register(
                "operationalDefaults.participantPolicy.minStudents",
                numberInputTransform,
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Máximo de alumnos
            </label>
            <input
              type="number"
              min={1}
              {...register(
                "operationalDefaults.participantPolicy.maxStudents",
                numberInputTransform,
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/15"
            />
            <FieldError
              message={
                errors.operationalDefaults?.participantPolicy?.maxStudents
                  ?.message
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 xl:col-span-2">
        <h3 className="text-sm font-semibold text-slate-900">Preparación</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              {...register(
                "operationalDefaults.preparationPolicy.copyTemplateBlocksToLesson",
              )}
              className="rounded border-slate-300 text-[#9e2727] focus:ring-[#9e2727]"
            />
            Copiar bloques del modelo al crear clase real
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              {...register(
                "operationalDefaults.preparationPolicy.copyTemplateResourcesToLesson",
              )}
              className="rounded border-slate-300 text-[#9e2727] focus:ring-[#9e2727]"
            />
            Copiar recursos sugeridos al crear clase real
          </label>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Estado inicial de preparación
            </label>
            <select
              {...register(
                "operationalDefaults.preparationPolicy.defaultPreparationStatus",
              )}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9e2727]"
            >
              {(["needs_preparation", "prepared"] as const).map((status) => (
                <option key={status} value={status}>
                  {getPreparationStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
