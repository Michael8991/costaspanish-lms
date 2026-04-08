import { FORMAT_CARDS } from "@/components/ui/addResourcesForm/FormatSelectorCards";
import {
  MetaRow,
  SectionHeader,
} from "@/components/ui/addResourcesForm/FormSectionWrappers";
import { FormatType } from "@/lib/constants/resource.constants";
import { useUpdateResourceForm } from "@/lib/hooks/useUpdateResource";
import { cn, formatBytes, toDisplayLabel } from "@/lib/utils/form-helpers";
import { updateResourceSchema } from "@/lib/validators/resource";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import z from "zod";
import { UploadedResourceMeta } from "../../AddResourceForm";
import { zodResolver } from "@hookform/resolvers/zod";
import AddResourceSecondStep from "../../addResourceFormComponents/AddResourceSecondStep";

interface UpdateResourceProps {
  resourceId: string | null;
  onClose: () => void;
  selectedFormat: FormatType | undefined;
  onUploadFile: (
    file: File,
    format: Exclude<FormatType, "external_link">,
  ) => Promise<UploadedResourceMeta>;
}

type Step = 1 | 2;

const STEP_META: Record<Step, { title: string; hint: string }> = {
  1: {
    title: "Tipo de recurso",
    hint: "Elige el formato. El formulario se adapta automáticamente.",
  },
  2: {
    title: "Contenido",
    hint: "Sube el archivo o añade el enlace según el tipo elegido.",
  },
};

export default function UpdateResourceFileForm({
  selectedFormat,
  onClose,
  resourceId,
  onUploadFile,
}: UpdateResourceProps) {
  const [isUploading, setIsUploading] = useState(false);
  const {
    watch,
    formState: { errors },
  } = useFormContext<z.input<typeof updateResourceSchema>>();

  const router = useRouter();

  const values = watch();

  const { form, step, handleFormatSelection, setStep } = useUpdateResourceForm({
    onSubmit: async () => {},
  });

  const {
    handleSubmit,
    trigger,
    formState: { isSubmitting },
  } = form;

  const uploadForm = useForm<z.input<typeof updateResourceSchema>>({
    resolver: zodResolver(updateResourceSchema),
    defaultValues: {
      format: selectedFormat,
      storagePath: "",
      fileUrl: "",
      originalFilename: "",
      mimeType: "",
      thumbnailUrl: "",
      thumbnailStoragePath: "",
      externalUrl: "",
    },
  });

  const handleUpdateFormatSelection = (format: FormatType) => {
    uploadForm.setValue("format", format, { shouldValidate: true });
    if (format !== "pdf") {
      uploadForm.setValue("pageCount", undefined, { shouldValidate: true });
      uploadForm.setValue("thumbnailUrl", undefined, { shouldValidate: true });
      uploadForm.setValue("thumbnailStoragePath", undefined, {
        shouldValidate: true,
      });
    }

    if (format !== "audio" && format !== "video") {
      uploadForm.setValue("durationSeconds", undefined, {
        shouldValidate: true,
      });
    }

    if (format === "external_link") {
      uploadForm.setValue("storagePath", undefined, { shouldValidate: true });
      uploadForm.setValue("fileUrl", undefined, { shouldValidate: true });
      uploadForm.setValue("originalFilename", undefined, {
        shouldValidate: true,
      });
      uploadForm.setValue("mimeType", undefined, { shouldValidate: true });
      uploadForm.setValue("fileSizeBytes", undefined, { shouldValidate: true });
      uploadForm.setValue("pageCount", undefined, { shouldValidate: true });
      uploadForm.setValue("durationSeconds", undefined, {
        shouldValidate: true,
      });
      uploadForm.setValue("thumbnailUrl", undefined, { shouldValidate: true });
      uploadForm.setValue("thumbnailStoragePath", undefined, {
        shouldValidate: true,
      });
    } else {
      uploadForm.setValue("externalUrl", undefined, { shouldValidate: true });
    }

    setStep(2);
  };

  const progress = (step / 2) * 100;

  const goToNextStep = async () => {
    const currentFormat = uploadForm.watch("format") as FormatType;
    const fields = getStepFields(step, currentFormat);
    const isValid = await uploadForm.trigger(fields, {
      shouldFocus: true,
    });
    if (!isValid) return;
    if (step < 2) setStep((prev) => (prev + 1) as Step);
  };

  const goToPreviousStep = () => {
    if (step > 1) setStep((prev) => (prev - 1) as Step);
  };

  const submitUpdateFile = async () => {
    const uploadValues = uploadForm.getValues();
    const format = uploadValues.format;

    let payload: Record<string, unknown> = { format };

    if (format === "external_link") {
      payload = {
        format,
        externalUrl: uploadValues.externalUrl,
        storagePath: null,
        fileUrl: null,
        originalFilename: null,
        mimeType: null,
        fileSizeBytes: null,
        pageCount: null,
        durationSeconds: null,
        thumbnailUrl: null,
        thumbnailStoragePath: null,
      };
    } else {
      payload = {
        format,
        storagePath: uploadValues.storagePath,
        fileUrl: uploadValues.fileUrl,
        originalFilename: uploadValues.originalFilename,
        mimeType: uploadValues.mimeType,
        fileSizeBytes: uploadValues.fileSizeBytes,
        externalUrl: null,
      };

      if (format === "pdf") {
        payload.pageCount = uploadValues.pageCount;
        payload.thumbnailUrl = uploadValues.thumbnailUrl;
        payload.thumbnailStoragePath = uploadValues.thumbnailStoragePath;
        payload.durationSeconds = null;
      }

      if (format === "audio" || format === "video") {
        payload.durationSeconds = uploadValues.durationSeconds;
        payload.pageCount = null;
        payload.thumbnailUrl = null;
        payload.thumbnailStoragePath = null;
      }

      if (format === "image") {
        payload.pageCount = null;
        payload.durationSeconds = null;
        payload.thumbnailUrl = null;
        payload.thumbnailStoragePath = null;
      }
    }

    console.log("🔍 uploadForm values al submit:", uploadValues);
    console.log("📦 payload final:", payload);

    const res = await fetch(`/api/resources/${resourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("❌ API error response:", JSON.stringify(err, null, 2));
      return;
    }

    onClose();
    router.refresh();
  };
  return (
    <div className="mx-auto w-full max-w-5xl mt-5">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.25)]">
        <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-red-50/40 px-6 py-6 sm:px-8">
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
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter" && step < 4) e.preventDefault();
          }}
          className="grid gap-0"
        >
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {step === 1 && (
              <section className="space-y-6">
                <SectionHeader
                  title="¿A tipo de material quieres cambiar?"
                  description="Selecciona el formato principal. El siguiente paso cambia automáticamente según la elección."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {FORMAT_CARDS.map((card) => {
                    const Icon = card.icon;
                    const currentUploadFormat = uploadForm.watch("format");
                    const selected = currentUploadFormat === card.value;

                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => handleUpdateFormatSelection(card.value)}
                        className={cn(
                          "group rounded-3xl border p-5 text-left transition-all",
                          "hover:-translate-y-0.5 hover:shadow-lg",
                          selected
                            ? "border-[#9e2727] bg-red-50 ring-2 ring-red-100"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div
                            className={cn(
                              "inline-flex rounded-2xl p-3",
                              selected
                                ? "bg-[#9e2727] text-white"
                                : "bg-slate-100 text-slate-700",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          {selected && (
                            <span className="rounded-full bg-[#9e2727] px-2.5 py-1 text-xs font-medium text-white">
                              Seleccionado
                            </span>
                          )}
                        </div>

                        <div className="mb-1 text-base font-semibold text-slate-900">
                          {card.title}
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                          {card.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {errors.format?.message != undefined ? (
                  <div className="py-2 px-1 rounded-lg border-red-500 bg-red-300 flex items-center justify-center text-center text-red-600">
                    <p>{errors.format?.message}</p>
                  </div>
                ) : (
                  <></>
                )}
              </section>
            )}

            {step === 2 && (
              <FormProvider {...uploadForm}>
                <AddResourceSecondStep
                  uploadMessage=""
                  uploadError=""
                  onUploadFile={onUploadFile}
                />
              </FormProvider>
            )}

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

              {step < 2 ? (
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
                  onClick={() => submitUpdateFile()}
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
        </div>
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

    default:
      return [] as const;
  }
}
