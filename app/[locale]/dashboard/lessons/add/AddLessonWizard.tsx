import FirstStepAddLesson from "@/components/dashboard/lessons/add/FirstStepAddLesson";
import { Divide } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
  isTrial: boolean;
  blocks: {
    title: string;
    type: string;
    plannedContent: string;
    estimatedMinutes?: number;
  }[];

  preparationNotes?: string;
  homeworkAssigned?: string;
  nextLessonFocus?: string;
};

const defaultValues: AddLessonFormValues = {
  title: "",
  classType: "private",
  scheduledStart: "",
  scheduledEnd: "",
  timezone: "Europe/Madrid",
  isTrial: false,

  blocks: [],

  preparationNotes: "",
  homeworkAssigned: "",
  nextLessonFocus: "",
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
      "isTrial",
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
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <p className="text-sm font-medium text-[#9e2727]">
          Paso {currentStep + 1} de 3
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Nueva lección</h2>
        <p className="mt01 text-sm text-gray-500">
          Prepara una clase manualmente y añade los detalles necesarios.
        </p>
      </div>

      {currentStep === 0 && <FirstStepAddLesson />}

      {currentStep === 2 && (
        <div className=" rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
          Paso 2: Contenido de la lección.
        </div>
      )}
    </form>
  );
}
