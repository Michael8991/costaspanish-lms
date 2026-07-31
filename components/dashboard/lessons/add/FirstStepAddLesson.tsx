"use client";

import type { AddLessonFormValues } from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";
import CourseProfileSelect from "@/components/dashboard/courses/CourseProfileSelect";
import LessonDateTimePicker from "@/components/dashboard/lessons/add/LessonDateTimePicker";
import LessonRecurrenceEditor from "@/components/dashboard/lessons/add/LessonRecurrenceEditor";
import NewVoucherForm, {
  type NewVoucherFormData,
} from "@/components/dashboard/teacher/forms/NewVoucherForm";
import CustomModal from "@/components/ui/CustomModal";
import type { CourseProfileListItemDTO } from "@/lib/dto/course-profile.dto";
import type { LessonStudent } from "@/lib/hooks/useLessonStudents";
import { addMinutesToDatetimeLocal } from "@/lib/utils/lesson-datetime";
import { buildLessonTitle } from "@/lib/utils/lesson-title";
import {
  formatAssignedVoucherLabel,
  getCompatiblePlans,
  selectBestCompatiblePlan,
} from "@/lib/utils/lesson-voucher";
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

function isNonEmptyString(value: string | undefined | null): value is string {
  return typeof value === "string" && value.length > 0;
}

interface FirstStepAddLessonProps {
  students: LessonStudent[];
  isLoading: boolean;
  error: string | null;
  onRefetchStudents: () => Promise<void>;
  allowRecurrence: boolean;
  locale: string;
  isEditing: boolean;
}

type QuickVoucherTarget = {
  attendeeIndex: number;
  studentId: string;
};

type CreatedVoucherResponse = {
  error?: string;
  activePlans?: LessonStudent["activePlans"];
};

export default function FirstStepAddLesson({
  students,
  isLoading,
  error,
  onRefetchStudents,
  allowRecurrence,
  locale,
  isEditing,
}: FirstStepAddLessonProps) {
  const {
    control,
    getValues,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<AddLessonFormValues>();
  const [quickVoucherTarget, setQuickVoucherTarget] =
    useState<QuickVoucherTarget | null>(null);
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [createVoucherError, setCreateVoucherError] = useState("");

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "attendees",
  });

  const attendees = useWatch({
    control,
    name: "attendees",
  });
  const classType = useWatch({
    control,
    name: "classType",
  });
  const scheduledStart = useWatch({
    control,
    name: "scheduledStart",
  });
  const creationMode = useWatch({
    control,
    name: "creationMode",
  });
  const courseId = useWatch({
    control,
    name: "courseId",
  });
  const [selectedCourse, setSelectedCourse] =
    useState<CourseProfileListItemDTO | null>(null);

  const selectedStudentIds = useMemo(() => {
    return new Set(
      (attendees ?? [])
        .map((attendee) => attendee?.studentId)
        .filter(isNonEmptyString),
    );
  }, [attendees]);
  const generatedTitle = useMemo(
    () =>
      buildLessonTitle({
        attendees: attendees ?? [],
        students,
        classType,
        scheduledStart,
      }),
    [attendees, classType, scheduledStart, students],
  );
  const lastGeneratedTitleRef = useRef("");
  const classTypeRegistration = register("classType", {
    required: "Selecciona un tipo de clase",
  });

  useEffect(() => {
    if (creationMode === "course") return;

    const currentTitle = getValues("title");
    const shouldUseGeneratedTitle =
      !currentTitle.trim() ||
      currentTitle === lastGeneratedTitleRef.current;

    if (shouldUseGeneratedTitle) {
      setValue("title", generatedTitle, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }

    lastGeneratedTitleRef.current = generatedTitle;
  }, [creationMode, generatedTitle, getValues, setValue]);

  useEffect(() => {
    if (creationMode === "course") return;

    (attendees ?? []).forEach((attendee, index) => {
      const voucherPath = `attendees.${index}.voucherId` as const;
      const creditsPath = `attendees.${index}.creditsToConsume` as const;

      if (!classType) {
        if (attendee.voucherId) {
          setValue(voucherPath, "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        if (attendee.isTrial && attendee.creditsToConsume !== 0) {
          setValue(creditsPath, 0, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        return;
      }

      if (attendee.isTrial) {
        if (attendee.voucherId) {
          setValue(voucherPath, "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        if (attendee.creditsToConsume !== 0) {
          setValue(creditsPath, 0, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        return;
      }

      if (attendee.creditsToConsume !== 1) {
        setValue(creditsPath, 1, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (!attendee.studentId || isLoading) return;

      const student = students.find(
        (candidate) => candidate._id === attendee.studentId,
      );
      if (!student) return;

      const selectedPlan = selectBestCompatiblePlan(
        getCompatiblePlans(student, classType),
      );
      const nextVoucherId = selectedPlan?._id ?? "";

      if (attendee.voucherId !== nextVoucherId) {
        setValue(voucherPath, nextVoucherId, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  }, [attendees, classType, creationMode, isLoading, setValue, students]);

  const selectCourse = (
    nextCourseId: string,
    course?: CourseProfileListItemDTO,
  ) => {
    setValue("courseId", nextCourseId, {
      shouldDirty: !isEditing,
      shouldValidate: true,
    });
    setSelectedCourse(course ?? null);

    if (!course || isEditing) return;

    const courseClassType =
      course.classType || course.policySummary.defaultClassType;
    setValue("classType", courseClassType, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("timezone", course.policySummary.timezone || "Europe/Madrid", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("durationMinutes", course.policySummary.durationMinutes, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("title", `${course.name} · Clase`, {
      shouldDirty: true,
      shouldValidate: true,
    });
    replace(
      course.activeMemberIds.map((studentId) => ({
        studentId,
        voucherId: "",
        attendanceStatus: "pending" as const,
        creditsToConsume: course.policySummary.creditsPerLesson,
        isTrial: false,
      })),
    );

    if (scheduledStart) {
      setValue(
        "scheduledEnd",
        addMinutesToDatetimeLocal(
          scheduledStart,
          course.policySummary.durationMinutes,
        ),
        { shouldDirty: true, shouldValidate: true },
      );
    }
  };

  const setSourceMode = (nextMode: "course" | "free") => {
    setValue("creationMode", nextMode, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (nextMode === "free") {
      setSelectedCourse(null);
      setValue("courseId", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      replace([
        {
          studentId: "",
          voucherId: "",
          attendanceStatus: "pending",
          creditsToConsume: 1,
          isTrial: false,
        },
      ]);
      setValue("classType", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("durationMinutes", 60, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("timezone", "Europe/Madrid", {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (scheduledStart) {
        setValue(
          "scheduledEnd",
          addMinutesToDatetimeLocal(scheduledStart, 60),
          { shouldDirty: true, shouldValidate: true },
        );
      }
      setValue("title", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const quickVoucherStudent = quickVoucherTarget
    ? students.find(
        (student) => student._id === quickVoucherTarget.studentId,
      )
    : undefined;

  const closeQuickVoucherModal = () => {
    setQuickVoucherTarget(null);
    setCreateVoucherError("");
  };

  const createQuickVoucher = async (formData: NewVoucherFormData) => {
    if (!quickVoucherTarget || !classType) {
      setCreateVoucherError("Selecciona un alumno y un tipo de clase.");
      return;
    }

    try {
      setIsCreatingVoucher(true);
      setCreateVoucherError("");

      const response = await fetch(
        `/api/students/${quickVoucherTarget.studentId}/plans`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          cache: "no-store",
        },
      );
      const responseData = (await response.json().catch(() => null)) as
        | CreatedVoucherResponse
        | null;

      if (!response.ok) {
        throw new Error(responseData?.error || "No se pudo crear el bono.");
      }

      const createdPlan = selectBestCompatiblePlan(
        getCompatiblePlans(
          { activePlans: responseData?.activePlans ?? [] },
          classType,
        ),
      );
      if (!createdPlan) {
        throw new Error("El bono se creó, pero no se pudo seleccionarlo.");
      }

      await onRefetchStudents();
      setValue(
        `attendees.${quickVoucherTarget.attendeeIndex}.voucherId`,
        createdPlan._id,
        { shouldDirty: true, shouldValidate: true },
      );
      setValue(
        `attendees.${quickVoucherTarget.attendeeIndex}.creditsToConsume`,
        1,
        { shouldDirty: true, shouldValidate: true },
      );
      setValue(
        `attendees.${quickVoucherTarget.attendeeIndex}.isTrial`,
        false,
        { shouldDirty: true, shouldValidate: true },
      );
      closeQuickVoucherModal();
    } catch (creationError) {
      setCreateVoucherError(
        creationError instanceof Error
          ? creationError.message
          : "No se pudo crear el bono.",
      );
    } finally {
      setIsCreatingVoucher(false);
    }
  };

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

      <input type="hidden" {...register("creationMode")} />
      <input
        type="hidden"
        {...register("courseId", {
          validate: (value) =>
            creationMode !== "course" ||
            Boolean(value) ||
            "Selecciona un curso activo",
        })}
      />

      {!isEditing && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">
            Origen de la clase
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setSourceMode("course")}
              aria-pressed={creationMode === "course"}
              className={`rounded-2xl border p-4 text-left transition ${
                creationMode === "course"
                  ? "border-[#9e2727] bg-[#9e2727]/5 ring-2 ring-[#9e2727]/10"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-sm font-semibold text-gray-900">
                Desde curso activo
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                Usa un curso activo para rellenar alumnos, tipo de clase,
                duración y reglas automáticamente.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("free")}
              aria-pressed={creationMode === "free"}
              className={`rounded-2xl border p-4 text-left transition ${
                creationMode === "free"
                  ? "border-[#9e2727] bg-[#9e2727]/5 ring-2 ring-[#9e2727]/10"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-sm font-semibold text-gray-900">
                Clase libre
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                Usa este modo para trials, clases sueltas o clases antiguas sin
                curso.
              </span>
            </button>
          </div>
        </div>
      )}

      {creationMode === "course" && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <CourseProfileSelect
            value={courseId ?? ""}
            onChange={selectCourse}
            onAvailabilityChange={(hasActiveCourses) => {
              if (!hasActiveCourses && !isEditing) setSourceMode("free");
            }}
            locale={locale}
            disabled={isEditing}
          />
          {errors.courseId && (
            <p className="mt-2 text-xs text-red-600">
              {errors.courseId.message}
            </p>
          )}

          {selectedCourse && (
            <div className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Curso seleccionado
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedCourse.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Integrantes
                </p>
                <p className="mt-1 text-gray-700">
                  {selectedCourse.studentNames.join(", ") ||
                    "Sin integrantes activos"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Reglas
                </p>
                <p className="mt-1 text-gray-700">
                  {selectedCourse.policySummary.durationMinutes} min ·{" "}
                  {selectedCourse.classType} ·{" "}
                  {selectedCourse.policySummary.creditsPerLesson} crédito
                  {selectedCourse.policySummary.creditsPerLesson === 1
                    ? ""
                    : "s"}
                  /clase ·{" "}
                  {selectedCourse.policySummary.consumeOn === "completion"
                    ? "consume al completar"
                    : "consume al programar"}
                </p>
              </div>
              <p className="md:col-span-3 text-xs text-gray-500">
                Los alumnos vienen de los integrantes activos del curso. Los
                créditos se aplicarán según sus reglas en una fase posterior.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tipo de clase
          </label>
          <select
            {...classTypeRegistration}
            value={classType ?? ""}
            disabled={creationMode === "course"}
            onChange={(event) => {
              void classTypeRegistration.onChange(event);

              (attendees ?? []).forEach((attendee, index) => {
                if (!attendee.voucherId) return;

                setValue(`attendees.${index}.voucherId`, "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              });
            }}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          >
            <option value="">Selecciona tipo de clase</option>
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
          {!classType && creationMode === "free" && (
            <p className="mt-2 text-sm text-amber-700">
              Selecciona primero un tipo de clase para asignar bonos
              compatibles.
            </p>
          )}
        </div>

        <LessonDateTimePicker />

        {creationMode === "course" && (
          <p className="md:col-span-2 -mt-2 text-xs text-gray-500">
            Esta duración solo afecta a esta clase.
          </p>
        )}

        {allowRecurrence && <LessonRecurrenceEditor students={students} />}

        {creationMode === "free" && (
          <>
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-gray-900">
                Alumnos y bonos
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                El bono compatible se asigna automáticamente.
              </p>
            </div>

        {error && (
          <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {fields.map((field, index) => {
          const attendee = attendees?.[index];
          const selectedStudentId = attendee?.studentId ?? "";
          const selectedVoucherId = attendee?.voucherId ?? "";
          const isTrial = attendee?.isTrial ?? false;
          const selectedStudent = students.find(
            (student) => student._id === selectedStudentId,
          );
          const compatiblePlans = classType
            ? getCompatiblePlans(selectedStudent, classType)
            : [];
          const assignedPlan = selectedStudent?.activePlans.find(
            (plan) => plan._id === selectedVoucherId,
          );

          return (
            <div
              key={field.id}
              className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
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
                    })}
                    value={selectedStudentId}
                    disabled={isLoading}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      setValue(
                        `attendees.${index}.studentId`,
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                      setValue(`attendees.${index}.voucherId`, "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
                  >
                    <option value="">
                      {isLoading
                        ? "Cargando alumnos..."
                        : "Selecciona un alumno"}
                    </option>

                    {students.map((student) => {
                      const isAlreadySelected =
                        selectedStudentIds.has(student._id) &&
                        student._id !== selectedStudentId;

                      return (
                        <option
                          key={student._id}
                          value={student._id}
                          disabled={isAlreadySelected}
                        >
                          {student.fullName ||
                            student.contactEmail ||
                            "Alumno sin nombre"}
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
                    Bono asignado
                  </label>
                  <input
                    type="hidden"
                    {...register(`attendees.${index}.voucherId` as const, {
                      validate: (voucherId) =>
                        isTrial ||
                        compatiblePlans.some(
                          (plan) => plan._id === voucherId,
                        ) ||
                        "El alumno necesita un bono compatible o marcarse como clase de prueba.",
                    })}
                  />
                  <div
                    aria-live="polite"
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      classType && selectedStudentId && !isTrial && !assignedPlan
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {!classType
                      ? "Selecciona primero un tipo de clase."
                      : !selectedStudentId
                        ? "Selecciona un alumno."
                        : isTrial
                          ? "Trial"
                          : isLoading
                            ? "Comprobando bonos..."
                          : assignedPlan
                            ? formatAssignedVoucherLabel(assignedPlan)
                            : "Sin bono compatible"}
                  </div>
                  {classType &&
                    selectedStudentId &&
                    selectedStudent &&
                    !isTrial &&
                    !isLoading &&
                    compatiblePlans.length === 0 && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-amber-700">
                          Este alumno no tiene bonos activos compatibles con
                          este tipo de clase.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateVoucherError("");
                            setQuickVoucherTarget({
                              attendeeIndex: index,
                              studentId: selectedStudentId,
                            });
                          }}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-50"
                        >
                          Crear bono
                        </button>
                      </div>
                    )}
                  {!isTrial && compatiblePlans.length > 1 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Hay más de un bono compatible. Se ha seleccionado
                      automáticamente el más próximo a vencer.
                    </p>
                  )}
                  {errors.attendees?.[index]?.voucherId && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.attendees[index]?.voucherId?.message}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isTrial}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const checked = event.target.checked;

                      setValue(`attendees.${index}.isTrial`, checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue(
                        `attendees.${index}.creditsToConsume`,
                        checked ? 0 : 1,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                      setValue(`attendees.${index}.voucherId`, "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
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
              className="md:col-span-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-[#9e2727] hover:text-[#9e2727]"
            >
              Añadir alumno
            </button>
          </>
        )}

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Título
          </label>
          <input
            type="text"
            {...register("title", {
              required: "El título es obligatorio",
              validate: (value) =>
                value.trim().length > 0 ||
                "El título es obligatorio",
            })}
            placeholder={generatedTitle}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />
          <input type="hidden" {...register("timezone")} />
          <p className="mt-1 text-xs text-gray-500">
            Se genera automáticamente, pero puedes editarlo para añadir más
            detalles.
          </p>
          {errors.title && (
            <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
          )}
        </div>
      </div>

      <CustomModal
        isOpen={Boolean(quickVoucherTarget && classType)}
        onClose={closeQuickVoucherModal}
        title="Crear bono"
        maxWidth="md"
      >
        {quickVoucherTarget && classType && (
          <NewVoucherForm
            variant="quick"
            student={
              quickVoucherStudent?.fullName ||
              quickVoucherStudent?.contactEmail ||
              "Alumno"
            }
            initialClassType={classType}
            onSubmitForm={createQuickVoucher}
            isSubmitting={isCreatingVoucher}
            submitError={createVoucherError}
            onClose={closeQuickVoucherModal}
          />
        )}
      </CustomModal>
    </section>
  );
}
