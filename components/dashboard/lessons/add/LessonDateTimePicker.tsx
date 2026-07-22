"use client";

import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import {
  addMinutesToDatetimeLocal,
  combineDateAndTimeToDatetimeLocal,
  dateValueToLocalDate,
  formatLocalDateValue,
  getDatetimeLocalDateValue,
  getDatetimeLocalTimeValue,
  getDurationMinutesFromStartEnd,
  getMonthDays,
} from "@/lib/utils/lesson-datetime";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const quickTimes = ["09:00", "10:00", "16:00", "17:00", "18:00"];
const durationOptions = [30, 45, 60, 90];
const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function LessonDateTimePicker() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();
  const scheduledStart =
    useWatch({ control, name: "scheduledStart" }) ?? "";
  const scheduledEnd = useWatch({ control, name: "scheduledEnd" }) ?? "";
  const selectedDateValue = getDatetimeLocalDateValue(scheduledStart);
  const selectedTimeValue = getDatetimeLocalTimeValue(scheduledStart);
  const [viewDate, setViewDate] = useState(() => {
    return dateValueToLocalDate(selectedDateValue) ?? new Date();
  });
  const [durationMinutes, setDurationMinutes] = useState(() => {
    return (
      getDurationMinutesFromStartEnd(scheduledStart, scheduledEnd) ?? 60
    );
  });
  const monthDays = useMemo(() => getMonthDays(viewDate), [viewDate]);
  const todayValue = formatLocalDateValue(new Date());
  const monthLabel = capitalize(
    new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    }).format(viewDate),
  );

  const updateDateTime = (dateValue: string, timeValue: string) => {
    const nextStart = combineDateAndTimeToDatetimeLocal(dateValue, timeValue);
    if (!nextStart) return;

    setValue("scheduledStart", nextStart, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      "scheduledEnd",
      addMinutesToDatetimeLocal(nextStart, durationMinutes),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };

  const selectDate = (dateValue: string) => {
    updateDateTime(dateValue, selectedTimeValue || "09:00");
  };

  const selectTime = (timeValue: string) => {
    updateDateTime(
      selectedDateValue || formatLocalDateValue(new Date()),
      timeValue,
    );
  };

  const selectDuration = (minutes: number) => {
    setDurationMinutes(minutes);

    if (scheduledStart) {
      setValue(
        "scheduledEnd",
        addMinutesToDatetimeLocal(scheduledStart, minutes),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    }
  };

  const changeMonth = (offset: number) => {
    setViewDate(
      (currentViewDate) =>
        new Date(
          currentViewDate.getFullYear(),
          currentViewDate.getMonth() + offset,
          1,
          12,
        ),
    );
  };

  return (
    <div className="md:col-span-2 mx-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <input
        type="hidden"
        {...register("scheduledStart", {
          required: "La fecha de inicio es obligatoria",
        })}
      />
      <input
        type="hidden"
        {...register("scheduledEnd", {
          required: "La fecha de fin es obligatoria",
        })}
      />

      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Fecha y hora</h4>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona el día, la hora de inicio y la duración de la clase.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="w-full max-w-[280px] rounded-xl border border-gray-200 bg-white p-2">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => changeMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-600 transition hover:bg-gray-50"
            >
              ←
            </button>
            <p className="text-xs font-semibold text-gray-900">{monthLabel}</p>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => changeMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-600 transition hover:bg-gray-50"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdayLabels.map((weekday) => (
              <span
                key={weekday}
                className="py-0.5 text-[11px] font-medium text-gray-400"
              >
                {weekday}
              </span>
            ))}
            {monthDays.map((day) => {
              const isSelected = day.dateValue === selectedDateValue;
              const isToday = day.dateValue === todayValue;

              return (
                <button
                  key={day.dateValue}
                  type="button"
                  disabled={!day.isCurrentMonth}
                  aria-label={`Seleccionar ${day.dateValue}`}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(day.dateValue)}
                  className={`h-7 w-7 justify-self-center rounded-md text-xs transition sm:h-8 sm:w-8 ${
                    isSelected
                      ? "bg-[#9e2727] font-semibold text-white"
                      : isToday
                        ? "border border-[#9e2727]/40 bg-white text-[#9e2727]"
                        : day.isCurrentMonth
                          ? "bg-white text-gray-700 hover:bg-[#9e2727]/5 hover:text-[#9e2727]"
                          : "cursor-default text-gray-300"
                  }`}
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Hora de inicio
            </label>
            <div className="flex flex-wrap gap-2">
              {quickTimes.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => selectTime(time)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    selectedTimeValue === time
                      ? "border-[#9e2727] bg-[#9e2727]/5 font-medium text-[#9e2727]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            <input
              type="time"
              value={selectedTimeValue}
              onChange={(event) => selectTime(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Duración</p>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => selectDuration(minutes)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    durationMinutes === minutes
                      ? "border-[#9e2727] bg-[#9e2727]/5 font-medium text-[#9e2727]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
            {scheduledStart && scheduledEnd ? (
              <>
                <span className="font-medium">Horario:</span>{" "}
                {selectedTimeValue}–{getDatetimeLocalTimeValue(scheduledEnd)}
              </>
            ) : (
              "Selecciona una fecha y hora."
            )}
          </div>
        </div>
      </div>

      {(errors.scheduledStart || errors.scheduledEnd) && (
        <div className="mt-3 space-y-1">
          {errors.scheduledStart && (
            <p className="text-xs text-red-600">
              {errors.scheduledStart.message}
            </p>
          )}
          {errors.scheduledEnd && (
            <p className="text-xs text-red-600">
              {errors.scheduledEnd.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
