"use client";

import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import type { LessonStudent } from "@/lib/hooks/useLessonStudents";
import {
  generateWeeklyRecurringLessonDates,
  getWeekdayValueFromDateTime,
  includeBaseLessonOccurrence,
  type WeekdayValue,
} from "@/lib/utils/lesson-recurrence";
import { buildLessonTitle } from "@/lib/utils/lesson-title";
import { getCurrentLessonNumber } from "@/lib/utils/lesson-voucher";
import { useMemo } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

const weekdayOptions: Array<{ value: WeekdayValue; label: string }> = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

function formatOccurrenceDate(value: string) {
  const date = new Date(`${value}:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

interface LessonRecurrenceEditorProps {
  students: LessonStudent[];
}

export default function LessonRecurrenceEditor({
  students,
}: LessonRecurrenceEditorProps) {
  const {
    control,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();
  const recurrence = useWatch({ control, name: "recurrence" });
  const watchedAttendees = useWatch({ control, name: "attendees" });
  const attendees = useMemo(
    () => watchedAttendees ?? [],
    [watchedAttendees],
  );
  const classType = useWatch({ control, name: "classType" });
  const lessonTitle = useWatch({ control, name: "title" }) ?? "";
  const scheduledStart =
    useWatch({ control, name: "scheduledStart" }) ?? "";
  const scheduledEnd = useWatch({ control, name: "scheduledEnd" }) ?? "";
  const enabled = recurrence?.enabled ?? false;
  const daysOfWeek = useMemo(
    () => recurrence?.daysOfWeek ?? [],
    [recurrence?.daysOfWeek],
  );
  const endsOn = recurrence?.endsOn ?? "";
  const baseWeekday = getWeekdayValueFromDateTime(scheduledStart);
  const { field: daysField, fieldState: daysFieldState } = useController({
    control,
    name: "recurrence.daysOfWeek",
    rules: {
      validate: (value) =>
        !enabled ||
        value.length > 0 ||
        "Selecciona al menos un día de repetición.",
    },
  });

  const occurrences = useMemo(() => {
    if (
      !enabled ||
      !scheduledStart ||
      !scheduledEnd ||
      !endsOn ||
      daysOfWeek.length === 0
    ) {
      return [];
    }

    return includeBaseLessonOccurrence(
      generateWeeklyRecurringLessonDates({
        scheduledStart,
        scheduledEnd,
        daysOfWeek,
        endsOn,
      }),
      scheduledStart,
      scheduledEnd,
    );
  }, [
    daysOfWeek,
    enabled,
    endsOn,
    scheduledEnd,
    scheduledStart,
  ]);

  const selectedPlan = useMemo(() => {
    for (const attendee of attendees) {
      if (attendee.isTrial || !attendee.voucherId) continue;

      const student = students.find(
        (candidate) => candidate._id === attendee.studentId,
      );
      const plan = student?.activePlans.find(
        (candidate) => candidate._id === attendee.voucherId,
      );

      if (plan) return plan;
    }

    return undefined;
  }, [attendees, students]);
  const baseLessonNumber = selectedPlan
    ? getCurrentLessonNumber(selectedPlan)
    : undefined;
  const previews = useMemo(
    () =>
      occurrences.map((occurrence, occurrenceIndex) => ({
        ...occurrence,
        title:
          occurrence.scheduledStart === scheduledStart && lessonTitle.trim()
            ? lessonTitle.trim()
            : buildLessonTitle({
                attendees,
                students,
                classType,
                scheduledStart: occurrence.scheduledStart,
                progressOverride:
                  baseLessonNumber !== undefined &&
                  selectedPlan?.creditsTotal !== undefined
                    ? {
                        currentLessonNumber:
                          baseLessonNumber + occurrenceIndex,
                        creditsTotal: selectedPlan.creditsTotal,
                      }
                    : undefined,
              }),
      })),
    [
      attendees,
      baseLessonNumber,
      classType,
      lessonTitle,
      occurrences,
      scheduledStart,
      selectedPlan,
      students,
    ],
  );
  const exceedsAvailableCredits =
    selectedPlan?.creditsRemaining !== undefined &&
    occurrences.length > selectedPlan.creditsRemaining;
  const baseDayIsMissing =
    Boolean(baseWeekday) && !daysOfWeek.includes(baseWeekday as WeekdayValue);

  const toggleRecurrence = (checked: boolean) => {
    setValue("recurrence.enabled", checked, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (checked && daysOfWeek.length === 0 && baseWeekday) {
      setValue("recurrence.daysOfWeek", [baseWeekday], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (!checked) clearErrors("recurrence");
  };

  const toggleWeekday = (weekday: WeekdayValue) => {
    const nextDays = daysOfWeek.includes(weekday)
      ? daysOfWeek.filter((day) => day !== weekday)
      : [...daysOfWeek, weekday];

    daysField.onChange(nextDays);
  };

  return (
    <div className="md:col-span-2 mx-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-4">
      <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-900">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => toggleRecurrence(event.target.checked)}
          className="h-4 w-4 accent-[#9e2727]"
        />
        Repetir esta clase
      </label>

      <input type="hidden" {...register("recurrence.frequency")} />

      {enabled && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                Frecuencia
              </p>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                Semanal
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                Repetir hasta
              </label>
              <input
                type="date"
                min={scheduledStart.slice(0, 10) || undefined}
                {...register("recurrence.endsOn", {
                  validate: (value) => {
                    if (!enabled) return true;
                    if (!value) {
                      return "Selecciona hasta cuándo se repite la clase.";
                    }
                    if (
                      scheduledStart &&
                      value < scheduledStart.slice(0, 10)
                    ) {
                      return "La fecha final no puede ser anterior a la clase actual.";
                    }
                    return true;
                  },
                })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
              />
              {errors.recurrence?.endsOn && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.recurrence.endsOn.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Días de la semana
            </p>
            <div className="flex flex-wrap gap-2">
              {weekdayOptions.map((weekday) => {
                const isSelected = daysOfWeek.includes(weekday.value);

                return (
                  <button
                    key={weekday.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleWeekday(weekday.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "border-[#9e2727] bg-[#9e2727]/5 text-[#9e2727]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {weekday.label}
                  </button>
                );
              })}
            </div>
            {daysFieldState.error && (
              <p className="mt-1 text-xs text-red-600">
                {daysFieldState.error.message}
              </p>
            )}
          </div>

          {baseDayIsMissing && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              El día de la clase actual no está seleccionado en la recurrencia.
            </p>
          )}

          {exceedsAvailableCredits && selectedPlan && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Esta recurrencia genera {occurrences.length} clases, pero el bono
              solo tiene {selectedPlan.creditsRemaining} créditos restantes.
            </p>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-800">Preview</p>
              {previews.length > 0 && (
                <span className="text-xs text-gray-500">
                  {previews.length} clases en total
                </span>
              )}
            </div>
            {previews.length > 0 ? (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                {previews.map((preview) => (
                  <div
                    key={preview.scheduledStart}
                    className="rounded-lg bg-white px-3 py-2 text-xs text-gray-700"
                  >
                    <span className="font-medium text-[#9e2727]">
                      {formatOccurrenceDate(preview.scheduledStart)}
                    </span>
                    <span className="mx-2 text-gray-300">·</span>
                    {preview.title}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-xs text-gray-500">
                Selecciona días y fecha final para ver las clases que se
                programarán.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
