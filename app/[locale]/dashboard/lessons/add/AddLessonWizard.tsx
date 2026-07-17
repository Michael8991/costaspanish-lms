"use client";

import FirstStepAddLesson from "@/components/dashboard/lessons/add/FirstStepAddLesson";
import SecondStepAddLesson from "@/components/dashboard/lessons/add/SecondStepAddLesson";
import ThirdStepAddLesson from "@/components/dashboard/lessons/add/ThirdStepAddLesson";
import { useEffect, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import LessonToolBox from "../../../../../components/dashboard/lessons/add/LessonToolBox";
import { ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { useRouter } from "next/navigation";

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
  classType:
    | "private"
    | "pair"
    | "group_regular"
    | "semi_intensive"
    | "intensive";
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;

  attendees: {
    studentId: string;
    voucherId: string;
    attendanceStatus: "pending";
    creditsToConsume: number;
    isTrial?: boolean;
  }[];

  blocks: {
    title: string;
    type: string;
    cefrLevels: string[];
    skills: string[];
    tags: string[];
    resources: string[];
    plannedContent: string;
    estimatedMinutes?: number;
    errorCategories: string[];
    completionStatus:
      | "completed"
      | "partially_completed"
      | "not_completed"
      | "skipped";
    carryOverToNextLesson?: boolean;
  }[];

  preparationNotes?: string;
  homeworkAssigned?: string;
  nextLessonFocus?: string;

  syncGoogleCalendar?: boolean;
};

const defaultValues: AddLessonFormValues = {
  title: "",
  classType: "private",
  scheduledStart: "",
  scheduledEnd: "",
  timezone: "Europe/Madrid",

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

  const form = useForm<AddLessonFormValues>({
    defaultValues: initialValues ?? defaultValues,
    mode: "onBlur",
    shouldUnregister: false,
  });
  const isSubmitting = form.formState.isSubmitting;

  const handleNext = async () => {
    const isValid = await form.trigger([
      "title",
      "classType",
      "scheduledStart",
      "scheduledEnd",
      "timezone",
    ]);

    if (!isValid) {
      return;
    }
    setCurrentStep((step) => step + 1);
  };

  const handlePrevious = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const {
    fields: blockFields,
    append: appendBlock,
    remove: removeBlocks,
  } = useFieldArray({ control: form.control, name: "blocks" });

  function createBlocksFromResources(resources: ResourceListItemDTO[]) {
    resources.forEach((resource) => {
      appendBlock({
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
    const payload = {
      title: values.title,
      classType: values.classType,
      scheduledStart: values.scheduledStart,
      scheduledEnd: values.scheduledEnd,
      timezone: values.timezone,

      attendees: values.attendees.map((attendee) => ({
        ...attendee,
        voucherId: attendee.isTrial
          ? undefined
          : attendee.voucherId || undefined,
        creditsToConsume: attendee.isTrial ? 0 : attendee.creditsToConsume,
      })),

      preparationNotes: values.preparationNotes,
      homeworkAssigned: values.homeworkAssigned,
      nextLessonFocus: values.nextLessonFocus,

      blocks: values.blocks.map((block) => ({
        title: block.title,
        type: block.type,
        cefrLevels: block.cefrLevels ?? [],
        skills: block.skills ?? [],
        tags: block.tags ?? [],
        resources: block.resources ?? [],
        plannedContent: block.plannedContent,
        estimatedMinutes: block.estimatedMinutes,
        errorCategories: block.errorCategories ?? [],
        completionStatus: block.completionStatus ?? "not_completed",
        carryOverToNextLesson: block.carryOverToNextLesson ?? false,
      })),
    };

    const response = await fetch(
      mode === "edit" && lessonId ? `/api/lessons/${lessonId}` : "/api/lessons",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Error al guardar la clase");
    }

    router.push(`/${locale}/dashboard/lessons/${data.item.id}`);
    router.refresh();
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
          onSubmit={form.handleSubmit(onSubmit)}
          className={`${currentStep === 1 ? "col-span-11" : "col-span-12"} rounded-2xl border border-gray-200 bg-white p-6 shadow-sm `}
        >
          <div className="mb-6">
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              Nueva lección
            </h2>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              Prepara una clase manualmente y añade los detalles necesarios.
            </p>
          </div>

          <p className="text-sm font-medium text-[#9e2727]">
            Paso {currentStep + 1} de 3
          </p>
          {currentStep === 0 && <FirstStepAddLesson />}

          {currentStep === 1 && (
            <SecondStepAddLesson
              blockFields={blockFields}
              appendBlock={appendBlock}
              removeBlock={removeBlocks}
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
            {submitError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
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
