"use client";

import { FormatType } from "@/lib/constants/resource.constants";

import { z } from "zod";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { FormProvider } from "react-hook-form";
import { cn, formatBytes, toDisplayLabel } from "@/lib/utils/form-helpers";
import AddResourceFirstStep from "./addResourceFormComponents/AddResourceFirstStep";
import { createResourceSchema } from "@/lib/validators/resource";
import { AddResourcePayload } from "@/lib/utils/resource-mappers";
import { useAddResourceForm } from "@/lib/hooks/useCreateResource";
import AddResourceSecondStep from "./addResourceFormComponents/AddResourceSecondStep";
import AddResourceThirdStep from "./addResourceFormComponents/AddResourceThirdStep";
import AddResourceFourthStep from "./addResourceFormComponents/AddResourceFourthStep";
import { MetaRow } from "@/components/ui/addResourcesForm/FormSectionWrappers";

export type UploadedResourceMeta = {
  storagePath?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  pageCount?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
  fileSizeBytes?: number;
};

type Step = 1 | 2 | 3 | 4;

export type CreateResourceValues = z.infer<typeof createResourceSchema>;

type AddResourceFormProps = {
  onSubmit: (payload: AddResourcePayload) => Promise<void> | void;
  onUploadFile?: (
    file: File,
    format: Exclude<FormatType, "external_link">,
  ) => Promise<UploadedResourceMeta>;
  initialValues?: Partial<CreateResourceValues>;
};

const STEP_META: Record<Step, { title: string; hint: string }> = {
  1: {
    title: "Tipo de recurso",
    hint: "Elige el formato. El formulario se adapta automáticamente.",
  },
  2: {
    title: "Contenido",
    hint: "Sube el archivo o añade el enlace según el tipo elegido.",
  },
  3: {
    title: "Metadatos pedagógicos",
    hint: "Haz que el material sea fácil de encontrar y reutilizar.",
  },
  4: {
    title: "Revisión final",
    hint: "Comprueba el resumen antes de guardar.",
  },
};

export default function AddResourceForm({
  onSubmit,
  onUploadFile,
}: AddResourceFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const { form, step, handleFormatSelection, setStep } = useAddResourceForm({
    onSubmit: async () => {},
  });

  const {
    watch,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const values = watch();
  const selectedFormat = values.format;

  const progress = (step / 4) * 100;

  const goToNextStep = async () => {
    const fields = getStepFields(step, selectedFormat);
    const isValid = await trigger(fields, { shouldFocus: true });
    if (!isValid) return;

    if (step < 4) setStep((prev) => (prev + 1) as Step);
  };

  const goToPreviousStep = () => {
    if (step > 1) setStep((prev) => (prev - 1) as Step);
  };

  const submitForm = async (
    rawFormData: z.input<typeof createResourceSchema>,
  ) => {
    const formData = rawFormData as CreateResourceValues;
    const payload: AddResourcePayload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status ?? "draft",
      visibility: formData.visibility ?? "private",
      pedagogicalType: formData.pedagogicalType,
      transcriptText: formData.transcriptText?.trim() || undefined,
      levels: formData.levels,
      skills: formData.skills,
      deliveryModes: formData.deliveryModes,
      lessonStage: formData.lessonStages, //?pllural o singular en singular deberia cambiarlo en el modelo tmb?
      grammarTopics: formData.grammarTopics,
      vocabularyTopics: formData.vocabularyTopics,
      tags: formData.tags,
      estimatedDurationMinutes: formData.estimatedDurationMinutes,
      difficulty: formData.difficulty,
      hasAnswerKey: formData.hasAnswerKey,
      requiresTeacherReview: formData.requiresTeacherReview,
      format: formData.format,
      storagePath: formData.storagePath || undefined,
      fileUrl: formData.fileUrl || undefined,
      originalFilename: formData.originalFilename || undefined,
      mimeType: formData.mimeType || undefined,
      fileSizeBytes: formData.fileSizeBytes,
      pageCount: formData.pageCount,
      durationSeconds: formData.durationSeconds,
      thumbnailUrl: formData.thumbnailUrl || undefined,
      thumbnailStoragePath: formData.thumbnailStoragePath || undefined,
      externalUrl: formData.externalUrl || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <div className="mx-auto w-full max-w-5xl mt-5">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.25)]">
        <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-red-50/40 px-6 py-6 sm:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                <Sparkles className="h-3.5 w-3.5" />
                Biblioteca de recursos
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Añadir nuevo material
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Flujo guiado, validación por pasos y ramificaciones inteligentes
                según el formato.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 backdrop-blur">
              <div className="font-medium text-slate-900">Paso {step} de 4</div>
              <div>{STEP_META[step].title}</div>
            </div>
          </div>

          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#9e2727] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {Object.keys(STEP_META).map((key) => {
              const stepNumber = Number(key) as Step;
              const active = step === stepNumber;
              const done = step > stepNumber;

              return (
                <div
                  key={stepNumber}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition",
                    active && "border-slate-900 bg-slate-900 text-white",
                    done && "border-red-200 bg-red-50 text-red-800",
                    !active &&
                      !done &&
                      "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                        active && "bg-white/20 text-white",
                        done && "bg-red-100 text-red-700",
                        !active && !done && "bg-slate-100 text-slate-500",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : stepNumber}
                    </span>
                    Paso {stepNumber}
                  </div>
                  <div className="text-sm font-medium">
                    {STEP_META[stepNumber].title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit(submitForm)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && step < 4) e.preventDefault();
            }}
            className="grid gap-0 lg:grid-cols-[1.4fr_0.8fr]"
          >
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              {step === 1 && (
                <AddResourceFirstStep
                  selectedFormat={watch("format")}
                  errorMessage={errors.format?.message}
                  onSelectFormat={handleFormatSelection}
                />
              )}

              {step === 2 && (
                <AddResourceSecondStep
                  uploadMessage=""
                  uploadError={uploadError}
                  onUploadFile={onUploadFile}
                />
              )}

              {step === 3 && <AddResourceThirdStep />}

              {step === 4 && <AddResourceFourthStep />}

              <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={step === 1}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Atrás
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit(submitForm)}
                    disabled={isSubmitting || isUploading}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-[#9e2727] px-6 py-2.5 text-sm  text-white transition hover:bg-[#8d2323] disabled:opacity-60"
                  >
                    {(isSubmitting || isUploading) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Finalizar y guardar
                  </button>
                )}
              </div>
            </div>

            <aside className="border-t border-slate-100 bg-slate-50/70 px-6 py-6 lg:border-l lg:border-t-0 sm:px-8">
              <div className="sticky top-6 space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    Ayuda contextual
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {STEP_META[step].hint}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    Vista rápida
                  </div>

                  <div className="space-y-3 text-sm">
                    <MetaRow
                      label="Formato"
                      value={
                        values.format ? toDisplayLabel(values.format) : "—"
                      }
                    />
                    <MetaRow label="Título" value={values.title || "—"} />
                    <MetaRow
                      label="Archivo"
                      value={values.originalFilename || "—"}
                    />
                    <MetaRow
                      label="Peso"
                      value={
                        typeof values.fileSizeBytes === "number"
                          ? formatBytes(values.fileSizeBytes)
                          : "0 B"
                      }
                    />
                    <MetaRow
                      label="Estado"
                      value={
                        values.status ? toDisplayLabel(values.status) : "—"
                      }
                    />
                  </div>
                </div>
              </div>
            </aside>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

function getStepFields(step: Step, format?: FormatType) {
  switch (step) {
    case 1:
      return ["format"] as const;

    case 2:
      if (format === "external_link") {
        return ["externalUrl"] as const;
      }
      if (format === "pdf") {
        return [
          "fileUrl",
          "storagePath",
          "thumbnailUrl",
          "thumbnailStoragePath",
        ] as const;
      }
      return ["fileUrl", "storagePath"] as const;

    case 3:
      return [
        "title",
        "description",
        "pedagogicalType",
        "levels",
        "skills",
        "deliveryModes",
        "lessonStages",
        "grammarTopics",
        "vocabularyTopics",
        "tags",
      ] as const;

    case 4:
      return ["status", "visibility"] as const;

    default:
      return [] as const;
  }
}
