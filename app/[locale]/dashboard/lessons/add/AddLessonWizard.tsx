"use client";

import FirstStepAddLesson from "@/components/dashboard/lessons/add/FirstStepAddLesson";
import SecondStepAddLesson from "@/components/dashboard/lessons/add/SecondStepAddLesson";
import ThirdStepAddLesson from "@/components/dashboard/lessons/add/ThirdStepAddLesson";
import { type FormEvent, useEffect, useState } from "react";
import {
  type FieldErrors,
  type FieldPath,
  FormProvider,
  type SubmitErrorHandler,
  useFieldArray,
  useForm,
} from "react-hook-form";
import LessonToolBox from "../../../../../components/dashboard/lessons/add/LessonToolBox";
import { ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { useRouter } from "next/navigation";
import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";
import { createClientId } from "@/components/dashboard/lessons/add/createClientId";
import { useLessonStudents } from "@/lib/hooks/useLessonStudents";
import type { LessonClassType } from "@/lib/types/lesson";
import { buildLessonTitle } from "@/lib/utils/lesson-title";
import { getCompatiblePlans } from "@/lib/utils/lesson-voucher";
import type { WeekdayValue } from "@/lib/utils/lesson-recurrence";

function getBlockTypeFromResource(
  resource: ResourceListItemDTO,
): AddLessonFormValues["blocks"][number]["type"] {
  if (resource.skills?.includes("speaking")) return "speaking";
  if (resource.skills?.includes("listening")) return "listening";
  if (resource.skills?.includes("reading")) return "reading";
  if (resource.skills?.includes("writing")) return "writing";
  if (resource.skills?.includes("grammar")) return "grammar";
  if (resource.skills?.includes("vocabulary")) return "vocabulary";
  if (resource.skills?.includes("pronunciation")) return "pronunciation";

  return "custom";
}

export type AddLessonFormValues = {
  title: string;
  classType: LessonClassType | "";
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  courseId?: string;

  recurrence: {
    enabled: boolean;
    frequency: "weekly";
    daysOfWeek: WeekdayValue[];
    endsOn: string;
  };

  attendees: {
    studentId: string;
    voucherId: string;
    attendanceStatus: "pending";
    creditsToConsume: number;
    isTrial?: boolean;
  }[];

  blocks: {
    lineageId?: string;
    order?: number;
    title: string;
    type: string;
    cefrLevels: string[];
    skills: string[];
    tags: string[];
    resources: string[];
    plannedContent: string;
    actualContent?: string;
    plannedObjectives?: string[];
    achievedObjectives?: string[];
    estimatedMinutes?: number;
    actualMinutes?: number;
    blockSuccessRating?: number;
    studentDifficultyLevel?: number;
    engagementLevel?: number;
    errorCategories: string[];
    studentDifficultiesText?: string;
    teacherReflection?: string;
    nextStepSuggestion?: string;
    completionStatus:
      | "completed"
      | "partially_completed"
      | "not_completed"
      | "skipped";
    carryOverToNextLesson?: boolean;
    origin?: {
      sourceLessonId: string;
      sourceBlockId?: string;
      sourceCourseId?: string;
      sourceStudentIds: string[];
      sourceLessonTitle?: string;
      sourceLessonDate?: string;
      sourceBlockTitle?: string;
    };
  }[];

  preparationNotes?: string;
  homeworkAssigned?: string;
  nextLessonFocus?: string;

  syncGoogleCalendar?: boolean;
};

const defaultValues: AddLessonFormValues = {
  title: "",
  classType: "",
  scheduledStart: "",
  scheduledEnd: "",
  timezone: "Europe/Madrid",

  recurrence: {
    enabled: false,
    frequency: "weekly",
    daysOfWeek: [],
    endsOn: "",
  },

  attendees: [
    {
      studentId: "",
      voucherId: "",
      attendanceStatus: "pending",
      creditsToConsume: 1,
      isTrial: false,
    },
  ],

  preparationNotes: "",
  homeworkAssigned: "",
  nextLessonFocus: "",

  blocks: [],

  syncGoogleCalendar: false,
};

const FINAL_STEP_INDEX = 2;

const FIRST_STEP_FIELDS = [
  "title",
  "classType",
  "scheduledStart",
  "scheduledEnd",
  "timezone",
] as const satisfies readonly FieldPath<AddLessonFormValues>[];

interface LessonFormWizardProps {
  locale: string;
  mode?: "create" | "edit";
  lessonId?: string;
  initialValues?: AddLessonFormValues;
}

export default function AddLessonWizard({
  locale,
  mode,
  lessonId,
  initialValues,
}: LessonFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    students,
    isLoading: isLoadingStudents,
    error: studentsError,
    refetch: refetchStudents,
  } = useLessonStudents();

  const form = useForm<AddLessonFormValues>({
    defaultValues: initialValues ?? defaultValues,
    mode: "onBlur",
    shouldUnregister: false,
  });
  const isSubmitting = form.formState.isSubmitting;

  const handleNext = async () => {
    const values = form.getValues();
    const stepFields = getStepValidationFields(currentStep, values);

    if (currentStep === 0) {
      form.clearErrors("scheduledEnd");
    }

    const isValid =
      stepFields.length === 0 ||
      (await form.trigger(stepFields, { shouldFocus: true }));

    if (!isValid) {
      setSubmitError(getStepValidationMessage(currentStep));
      return false;
    }

    if (currentStep === 0 && !hasValidDateRange(values)) {
      form.setError("scheduledEnd", {
        type: "validate",
        message: "La fecha de fin debe ser posterior a la fecha de inicio",
      });
      setSubmitError("Revisa la fecha de inicio y fin antes de continuar.");
      return false;
    }

    setSubmitError(null);
    setCurrentStep((step) => Math.min(step + 1, FINAL_STEP_INDEX));
    return true;
  };

  const handlePrevious = () => {
    setSubmitError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const {
    fields: blockFields,
    append: appendBlock,
    remove: removeBlocks,
  } = useFieldArray({ control: form.control, name: "blocks" });

  function createBlocksFromResources(resources: ResourceListItemDTO[]) {
    const currentBlockCount = form.getValues("blocks").length;

    resources.forEach((resource, index) => {
      appendBlock({
        lineageId: createClientId(),
        order: currentBlockCount + index,
        title: resource.title,
        type: getBlockTypeFromResource(resource),
        cefrLevels: resource.levels ?? [],
        skills: resource.skills ?? [],
        tags: resource.tags ?? [],
        resources: [resource.id],
        plannedContent:
          resource.description || `Trabajar con el recurso: ${resource.title}`,
        estimatedMinutes: resource.estimatedDurationMinutes ?? 10,
        errorCategories: [],
        completionStatus: "not_completed",
        carryOverToNextLesson: false,
      });
    });
  }

  const onSubmit = async (values: AddLessonFormValues) => {
    if (currentStep < FINAL_STEP_INDEX) {
      await handleNext();
      return;
    }

    setSubmitError(null);

    try {
      const classType = values.classType;

      if (!classType) {
        form.setError("classType", {
          type: "required",
          message: "Selecciona un tipo de clase",
        });
        setCurrentStep(0);
        setSubmitError("Selecciona un tipo de clase antes de guardar.");
        return;
      }

      const invalidVoucherIndexes = values.attendees.flatMap(
        (attendee, index) => {
          if (attendee.isTrial) return [];

          const student = students.find(
            (candidate) => candidate._id === attendee.studentId,
          );
          const hasCompatibleVoucher = getCompatiblePlans(
            student,
            classType,
          ).some((plan) => plan._id === attendee.voucherId);

          return hasCompatibleVoucher ? [] : [index];
        },
      );

      if (invalidVoucherIndexes.length > 0) {
        invalidVoucherIndexes.forEach((index) => {
          form.setError(`attendees.${index}.voucherId`, {
            type: "validate",
            message:
              "El alumno necesita un bono compatible o marcarse como clase de prueba.",
          });
        });
        setCurrentStep(0);
        setSubmitError(
          "Revisa los bonos asignados antes de guardar la lección.",
        );
        return;
      }

      const generatedTitle = buildLessonTitle({
        attendees: values.attendees,
        students,
        classType,
        scheduledStart: values.scheduledStart,
      });
      const payload = {
        courseId: values.courseId,
        title: generatedTitle,
        classType,
        scheduledStart: zonedDateTimeToISOString(
          values.scheduledStart,
          values.timezone,
        ),
        scheduledEnd: zonedDateTimeToISOString(
          values.scheduledEnd,
          values.timezone,
        ),
        timezone: values.timezone,
        recurrence:
          mode !== "edit" && values.recurrence.enabled
            ? {
                enabled: true,
                frequency: values.recurrence.frequency,
                daysOfWeek: values.recurrence.daysOfWeek,
                endsOn: values.recurrence.endsOn,
              }
            : undefined,

        attendees: values.attendees.map((attendee) => ({
          ...attendee,
          voucherId: attendee.isTrial
            ? undefined
            : attendee.voucherId || undefined,
          creditsToConsume: attendee.isTrial ? 0 : 1,
        })),

        preparationNotes: values.preparationNotes,
        homeworkAssigned: values.homeworkAssigned,
        nextLessonFocus: values.nextLessonFocus,

        blocks: values.blocks.map((block, index) => ({
          lineageId: block.lineageId,
          order: block.order ?? index,
          title: block.title,
          type: block.type,
          cefrLevels: block.cefrLevels ?? [],
          skills: block.skills ?? [],
          tags: block.tags ?? [],
          resources: block.resources ?? [],
          plannedContent: block.plannedContent,
          actualContent: block.actualContent,
          plannedObjectives: block.plannedObjectives ?? [],
          achievedObjectives: block.achievedObjectives ?? [],
          estimatedMinutes: block.estimatedMinutes,
          actualMinutes: block.actualMinutes,
          blockSuccessRating: block.blockSuccessRating,
          studentDifficultyLevel: block.studentDifficultyLevel,
          engagementLevel: block.engagementLevel,
          errorCategories: block.errorCategories ?? [],
          studentDifficultiesText: block.studentDifficultiesText,
          teacherReflection: block.teacherReflection,
          nextStepSuggestion: block.nextStepSuggestion,
          completionStatus: block.completionStatus ?? "not_completed",
          carryOverToNextLesson: block.carryOverToNextLesson ?? false,
          origin: block.origin?.sourceLessonId
            ? {
                sourceLessonId: block.origin.sourceLessonId,
                sourceBlockId: block.origin.sourceBlockId,
                sourceCourseId: block.origin.sourceCourseId,
                sourceStudentIds: block.origin.sourceStudentIds ?? [],
                sourceLessonTitle: block.origin.sourceLessonTitle,
                sourceLessonDate: block.origin.sourceLessonDate,
                sourceBlockTitle: block.origin.sourceBlockTitle,
              }
            : undefined,
        })),
      };

      const isEditRequest = mode === "edit" && Boolean(lessonId);
      const response = await fetch(
        isEditRequest ? `/api/lessons/${lessonId}` : "/api/lessons",
        {
          method: isEditRequest ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitError(getApiErrorMessage(data));
        return;
      }

      router.push(`/${locale}/dashboard/lessons/${data.item.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Error inesperado al guardar la lección",
      );
    }
  };

  const handleInvalidSubmit: SubmitErrorHandler<AddLessonFormValues> = (
    errors,
  ) => {
    const errorStep = getStepFromErrors(errors);
    setCurrentStep(errorStep);
    setSubmitError(getStepValidationMessage(errorStep));
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (currentStep < FINAL_STEP_INDEX) {
      event.preventDefault();
      void handleNext();
      return;
    }

    void form.handleSubmit(onSubmit, handleInvalidSubmit)(event);
  };

  useEffect(() => {
    if (mode === "edit" && initialValues) {
      form.reset(initialValues);
    }
  }, [mode, initialValues, form]);
  return (
    <FormProvider {...form}>
      <div className="items-center justify-center gap-2 grid grid-cols-12">
        <form
          onSubmit={handleFormSubmit}
          className={`${currentStep === 1 ? "col-span-11" : "col-span-12"} rounded-2xl border border-gray-200 bg-white p-6 shadow-sm `}
        >
          <p className="text-sm font-medium text-[#9e2727]">
            Paso {currentStep + 1} de 3
          </p>
          {submitError && (
            <div
              role="alert"
              className="mt-4 mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </div>
          )}
          {currentStep === 0 && (
            <FirstStepAddLesson
              students={students}
              isLoading={isLoadingStudents}
              error={studentsError}
              onRefetchStudents={refetchStudents}
              allowRecurrence={mode !== "edit"}
            />
          )}

          {currentStep === 1 && (
            <SecondStepAddLesson
              blockFields={blockFields}
              appendBlock={appendBlock}
              removeBlock={removeBlocks}
              lessonId={lessonId}
            />
          )}
          {currentStep === 2 && <ThirdStepAddLesson />}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0 || isSubmitting}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Guardando..." : "Guardar lección"}
              </button>
            )}
          </div>
        </form>
        {currentStep === 1 ? (
          <div className="col-span-1 flex items-center justify-center h-full  transition-all duration-150 ease-in-out">
            <LessonToolBox
              locale={locale}
              onCreateBlocksFromResources={createBlocksFromResources}
            />
          </div>
        ) : (
          ""
        )}
      </div>
    </FormProvider>
  );
}

function getStepValidationFields(
  step: number,
  values: AddLessonFormValues,
): FieldPath<AddLessonFormValues>[] {
  if (step === 0) {
    return [
      ...FIRST_STEP_FIELDS,
      ...values.attendees.flatMap((attendee, index) => {
        const fields: FieldPath<AddLessonFormValues>[] = [
          `attendees.${index}.studentId`,
        ];

        if (!attendee.isTrial && values.classType) {
          fields.push(`attendees.${index}.voucherId`);
        }

        return fields;
      }),
      ...(values.recurrence.enabled
        ? ([
            "recurrence.daysOfWeek",
            "recurrence.endsOn",
          ] satisfies FieldPath<AddLessonFormValues>[])
        : []),
    ];
  }

  if (step === 1) {
    return values.blocks.flatMap((_, index) => {
      const fields: FieldPath<AddLessonFormValues>[] = [
        `blocks.${index}.title`,
        `blocks.${index}.type`,
        `blocks.${index}.plannedContent`,
        `blocks.${index}.estimatedMinutes`,
      ];

      return fields;
    });
  }

  return [];
}

function hasValidDateRange(values: AddLessonFormValues) {
  if (!values.scheduledStart || !values.scheduledEnd) {
    return true;
  }

  const start = new Date(values.scheduledStart);
  const end = new Date(values.scheduledEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return true;
  }

  return end > start;
}

function getStepFromErrors(errors: FieldErrors<AddLessonFormValues>) {
  if (
    errors.title ||
    errors.classType ||
    errors.scheduledStart ||
    errors.scheduledEnd ||
    errors.timezone ||
    errors.attendees ||
    errors.recurrence
  ) {
    return 0;
  }

  if (errors.blocks) {
    return 1;
  }

  return FINAL_STEP_INDEX;
}

function getStepValidationMessage(step: number) {
  if (step === 0) {
    return "Revisa la información básica antes de continuar.";
  }

  if (step === 1) {
    return "Revisa los bloques de contenido marcados antes de continuar.";
  }

  return "Revisa los campos marcados antes de guardar la lección.";
}

function getApiErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return "Error al guardar la clase";
  }

  const issues = "issues" in data ? data.issues : undefined;

  if (issues && typeof issues === "object") {
    const formErrors =
      "formErrors" in issues && Array.isArray(issues.formErrors)
        ? issues.formErrors
        : [];

    if (typeof formErrors[0] === "string") {
      return formErrors[0];
    }

    const fieldErrors =
      "fieldErrors" in issues && issues.fieldErrors
        ? issues.fieldErrors
        : undefined;

    if (fieldErrors && typeof fieldErrors === "object") {
      const firstFieldMessages = Object.values(fieldErrors).find(Array.isArray);

      if (typeof firstFieldMessages?.[0] === "string") {
        return firstFieldMessages[0];
      }
    }
  }

  const error = "error" in data ? data.error : undefined;

  if (typeof error === "string") {
    return error;
  }

  return "Error al guardar la clase";
}
