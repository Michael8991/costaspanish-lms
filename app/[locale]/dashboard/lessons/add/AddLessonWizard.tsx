"use client";

import FirstStepAddLesson from "@/components/dashboard/lessons/add/FirstStepAddLesson";
import SecondStepAddLesson from "@/components/dashboard/lessons/add/SecondStepAddLesson";
import ThirdStepAddLesson from "@/components/dashboard/lessons/add/ThirdStepAddLesson";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

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

export default function AddLessonWizard() {
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<AddLessonFormValues>({ defaultValues, mode: "onBlur" });

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

  const onSubmit = async (values: AddLessonFormValues) => {
    console.log("Lesson form values: ", values);
    ////nota: Later:
    // await fetch("/api/lessons", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(values),
    // });
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
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

        {currentStep === 1 && <SecondStepAddLesson />}
        {currentStep === 2 && <ThirdStepAddLesson />}
        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          {currentStep < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              className="cursor-pointer rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8d2323]"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              className="cursor-pointer  rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8d2323]"
            >
              Guardar lección
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
