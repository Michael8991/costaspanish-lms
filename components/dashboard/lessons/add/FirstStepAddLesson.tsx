"use client";

import { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import { useLessonStudents } from "@/lib/hooks/useLessonStudents";
import { useFieldArray, useFormContext } from "react-hook-form";

export default function FirstStepAddLesson() {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();

  const { students, isLoading, error } = useLessonStudents();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "attendees",
  });

  const attendees = watch("attendees");
  const isTrial = watch("isTrial");

  const selectedStudentIds = attendees
    .map((attendee) => attendee.studentId)
    .filter(Boolean);

  console.log("Estudiantes con voucher status active", students);

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Información básica
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Define cuándo será la clase y qué tipo de lección estás preparando.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Título
          </label>
          <input
            type="text"
            placeholder="Clase privada A1 - María"
            {...register("title", {
              required: "El título es obligatorio",
            })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
          )}
        </div>
        {/* Select alumnos */}
        {/* <select
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          {...register("attendees.0.studentId", {
            required: "Selecciona un alumno",
            onChange: () => {
              setValue("attendees.0.voucherId", "");
            },
          })}
        >
          <option value="">Selecciona un alumno</option>

          {students.map((student) => {
            return (
              <option key={student._id} value={student._id}>
                {student.fullName}
              </option>
            );
          })}
        </select>

        <select
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          {...register("attendees.0.voucherId", {
            required: "Selecciona un bono",
          })}
          disabled={!selectedStudentId}
        >
          <option value="">Selecciona un bono</option>

          {activePlans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.classType} · {plan.creditsRemaining} créditos
            </option>
          ))}
        </select> */}
        {fields.map((field, index) => {
          const selectedStudentId = watch(`attendees.${index}.studentId`);

          const selectedStudent = students.find(
            (student) => student._id === selectedStudentId,
          );

          const activePlans = (selectedStudent?.activePlans ?? [])
            .filter((plan) => {
              const isActive = plan.status === "active";
              const hasCredits = plan.creditsRemaining > 0;
              const isNotExpired =
                !plan.validUntil || new Date(plan.validUntil) >= new Date();
              return isActive && hasCredits && isNotExpired;
            })
            .map((plan) => ({
              id: plan._id,
              classType: plan.classType,
              status: plan.status,
              creditsRemaining: plan.creditsRemaining,
              creditsTotal: plan.creditsTotal,
              validUntil: plan.validUntil,
            }));

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Alumno #{index + 1}
                </span>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Alumno
                  </label>

                  <select
                    {...register(`attendees.${index}.studentId` as const, {
                      required: "Selecciona un alumno",
                      onChange: () => {
                        setValue(`attendees.${index}.voucherId`, "");
                      },
                    })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                  >
                    <option value="">Selecciona un alumno</option>

                    {students.map((student) => {
                      const isAlreadySelected =
                        selectedStudentIds.includes(student._id) &&
                        student._id !== selectedStudentId;

                      return (
                        <option
                          key={student._id}
                          value={student._id}
                          disabled={isAlreadySelected}
                        >
                          {student.fullName}
                          {isAlreadySelected ? " · ya seleccionado" : ""}
                        </option>
                      );
                    })}
                  </select>

                  {errors.attendees?.[index]?.studentId && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.attendees[index]?.studentId?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Bono
                  </label>

                  <select
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                    {...register(`attendees.${index}.voucherId` as const, {
                      required: watch(`attendees.${index}.isTrial`)
                        ? false
                        : "Selecciona un bono",
                    })}
                    disabled={
                      !selectedStudentId || watch(`attendees.${index}.isTrial`)
                    }
                  >
                    <option value="">
                      {watch(`attendees.${index}.isTrial`)
                        ? "Trial: no consume bono"
                        : "Selecciona un bono"}
                    </option>

                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.classType} · {plan.creditsRemaining} créditos
                      </option>
                    ))}
                  </select>

                  {errors.attendees?.[index]?.voucherId && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.attendees[index]?.voucherId?.message}
                    </p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    {...register(`attendees.${index}.isTrial` as const, {
                      onChange: (event) => {
                        const checked = event.target.checked;

                        if (checked) {
                          setValue(`attendees.${index}.voucherId`, "");
                          setValue(`attendees.${index}.creditsToConsume`, 0);
                        } else {
                          setValue(`attendees.${index}.creditsToConsume`, 1);
                        }
                      },
                    })}
                  />
                  Clase de prueba para este alumno
                </label>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            append({
              studentId: "",
              voucherId: "",
              attendanceStatus: "pending",
              creditsToConsume: 1,
              isTrial: false,
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-[#9e2727] hover:text-[#9e2727] min-h-45"
        >
          Añadir alumno
        </button>
        {/* Select alumnos */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tipo de clase
          </label>
          <select
            {...register("classType", {
              required: "El tipo de clase es obligatorio",
            })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          >
            <option value="private">Privada</option>
            <option value="pair">Pareja</option>
            <option value="group_regular">Grupo regular</option>
            <option value="semi_intensive">Semi-intensivo</option>
            <option value="intensive">Intensivo</option>
          </select>
          {errors.classType && (
            <p className="mt-1 text-xs text-red-600">
              {errors.classType.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Zona horaria
          </label>
          <input
            type="text"
            {...register("timezone")}
            readOnly
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Inicio
          </label>
          <input
            type="datetime-local"
            {...register("scheduledStart", {
              required: "La fecha de inicio es obligatoria",
            })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />
          {errors.scheduledStart && (
            <p className="mt-1 text-xs text-red-600">
              {errors.scheduledStart.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Fin
          </label>
          <input
            type="datetime-local"
            {...register("scheduledEnd", {
              required: "La fecha de fin es obligatoria",
            })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />
          {errors.scheduledEnd && (
            <p className="mt-1 text-xs text-red-600">
              {errors.scheduledEnd.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <input
              type="checkbox"
              {...register("isTrial")}
              className="h-4 w-4 rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Clase de prueba
              </p>
              <p className="text-xs text-gray-500">
                No consumirá créditos del bono cuando se complete.
              </p>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}
