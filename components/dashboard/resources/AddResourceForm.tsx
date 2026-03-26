"use client";

import {
  CEFRLevel,
  DeliveryModes,
  FormatType,
  LessonStage,
  ResourceStatus,
  ResourceVisibility,
  SkillFocus,
  PedagogicalType,
  RESOURCE_STATUS,
  RESOURCE_VISIBILITY,
  PEDAGOGICAL_TYPES,
  CEFR_LEVELS,
  SKILL_FOCUS,
  DELIVERY_MODES,
  LESSON_STAGES,
  FORMAT_TYPES,
} from "@/lib/constants/resource.constants";

import { z } from "zod";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileAudio,
  FileImage,
  FileText,
  Film,
  Link2,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type UploadedResourceMeta = {
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

export type AddResourcePayload = {
  title: string;
  description: string;
  status: ResourceStatus;
  visibility: ResourceVisibility;

  pedagogicalType: PedagogicalType;
  transcriptText?: string;
  levels: CEFRLevel[];
  skills: SkillFocus[];
  deliveryModes: DeliveryModes[];
  lessonStage: LessonStage[];

  grammarTopics: string[];
  vocabularyTopics: string[];
  tags: string[];

  estimatedDurationMinutes?: number;
  difficulty?: number;

  hasAnswerKey: boolean;
  requiresTeacherReview: boolean;

  format: FormatType;

  storagePath?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;

  externalUrl?: string;
};

type Step = 1 | 2 | 3 | 4;

const addResourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres.")
      .max(180, "Máximo 180 caracteres."),
    description: z
      .string()
      .trim()
      .max(3000, "Máximo 3000 caracteres.")
      .default(""),
    status: z.enum(RESOURCE_STATUS).default("draft"),
    visibility: z.enum(RESOURCE_VISIBILITY).default("private"),

    pedagogicalType: z.enum(PEDAGOGICAL_TYPES, {
      message: "Selecciona un tipo pedagógico.",
    }),
    transcriptText: z.string().trim().optional().default(""),
    levels: z.array(z.enum(CEFR_LEVELS)).default([]),
    skills: z.array(z.enum(SKILL_FOCUS)).default([]),
    deliveryModes: z
      .array(z.enum(DELIVERY_MODES))
      .default(["classwork", "homework"]),
    lessonStages: z.array(z.enum(LESSON_STAGES)).default([]),

    grammarTopicsInput: z.string().max(500).default(""),
    vocabularyTopicsInput: z.string().max(500).default(""),
    tagsInput: z.string().max(500).default(""),

    estimatedDurationMinutes: z.number().min(1).max(180).optional(),
    difficulty: z.number().min(1).max(5).optional(),

    hasAnswerKey: z.boolean().default(false),
    requiresTeacherReview: z.boolean().default(false),

    format: z.enum(FORMAT_TYPES, {
      message: "Selecciona un formato.",
    }),

    storagePath: z.string().trim().max(500).optional().or(z.literal("")),
    fileUrl: z.string().trim().max(1200).optional().or(z.literal("")),
    originalFilename: z.string().trim().max(255).optional().or(z.literal("")),
    mimeType: z.string().trim().max(120).optional().or(z.literal("")),
    fileSizeBytes: z.number().min(0).optional(),
    pageCount: z.number().min(1).optional(),
    durationSeconds: z.number().min(1).optional(),
    thumbnailUrl: z.string().trim().max(1200).optional().or(z.literal("")),
    thumbnailStoragePath: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal("")),

    externalUrl: z.string().trim().max(1200).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const isExternal = data.format === "external_link";

    if (isExternal) {
      if (!data.externalUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "Introduce la URL externa del recurso.",
        });
      } else if (!isValidUrl(data.externalUrl)) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "La URL externa no es válida.",
        });
      }

      if (data.fileUrl || data.storagePath) {
        ctx.addIssue({
          code: "custom",
          path: ["format"],
          message: "Un recurso externo no debe llevar fileUrl ni storagePath.",
        });
      }
    } else {
      if (!data.fileUrl && !data.storagePath) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message:
            "Para un recurso subido necesitas al menos fileUrl o storagePath.",
        });
      }

      if (data.externalUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "externalUrl solo está permitido en external_link.",
        });
      }
    }

    if (data.format === "pdf") {
      if (!data.fileUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: "El PDF necesita fileUrl.",
        });
      }

      if (!data.thumbnailUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["thumbnailUrl"],
          message:
            "El PDF necesita thumbnailUrl para la miniatura en biblioteca.",
        });
      }
    }

    if (data.format === "pdf" && data.durationSeconds) {
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: "durationSeconds solo aplica a audio o video.",
      });
    }

    if (data.format !== "pdf" && typeof data.pageCount === "number") {
      ctx.addIssue({
        code: "custom",
        path: ["pageCount"],
        message: "pageCount solo aplica a PDF.",
      });
    }
  });

type AddResourceFormValues = z.infer<typeof addResourceSchema>;

type AddResourceFormProps = {
  onSubmit: (payload: AddResourcePayload) => Promise<void> | void;
  onUploadFile?: (
    file: File,
    format: Exclude<FormatType, "external_link">,
  ) => Promise<UploadedResourceMeta>;
  initialValues?: Partial<AddResourceFormValues>;
};

/* ==================== */
//!Helpers
/* ==================== */

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toDisplayLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeLooseStringArray(values: string): string[] {
  return [
    ...new Set(
      values
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function isValidUrl(value?: string) {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function getAcceptByFormat(format?: FormatType) {
  switch (format) {
    case "pdf":
      return ".pdf,application/pdf";
    case "image":
      return "image/*";
    case "audio":
      return "audio/*";
    case "video":
      return "video/*";
    default:
      return "*/*";
  }
}

function toggleArrayValue<T>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

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

const FORMAT_CARDS: Array<{
  value: FormatType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "pdf",
    title: "PDF",
    description: "Worksheets, readings, grammar sheets o fichas imprimibles.",
    icon: FileText,
  },
  {
    value: "image",
    title: "Imagen",
    description: "Flashcards, infografías, pósters visuales o capturas.",
    icon: FileImage,
  },
  {
    value: "audio",
    title: "Audio",
    description: "Listening tracks, dictados o pronunciación.",
    icon: FileAudio,
  },
  {
    value: "video",
    title: "Vídeo",
    description: "Video clips, explicaciones o tareas audiovisuales.",
    icon: Film,
  },
  {
    value: "external_link",
    title: "Enlace externo",
    description: "YouTube, Drive, article, app o recurso alojado fuera.",
    icon: ExternalLink,
  },
];

export default function AddResourceForm({
  onSubmit,
  onUploadFile,
  initialValues,
}: AddResourceFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    trigger,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof addResourceSchema>>({
    resolver: zodResolver(addResourceSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      visibility: "private",
      levels: [],
      skills: [],
      deliveryModes: ["classwork", "homework"],
      lessonStages: [],
      grammarTopicsInput: "",
      vocabularyTopicsInput: "",
      transcriptText: "",
      tagsInput: "",
      hasAnswerKey: false,
      requiresTeacherReview: false,
      storagePath: "",
      fileUrl: "",
      originalFilename: "",
      mimeType: "",
      thumbnailUrl: "",
      thumbnailStoragePath: "",
      externalUrl: "",
      ...initialValues,
    },
  });

  const values = watch();
  const selectedFormat = values.format;

  useEffect(() => {
    if (!selectedFormat) return;

    setUploadError("");
    setUploadMessage("");

    if (selectedFormat === "external_link") {
      setValue("storagePath", "");
      setValue("fileUrl", "");
      setValue("originalFilename", "");
      setValue("mimeType", "");
      setValue("fileSizeBytes", undefined);
      setValue("pageCount", undefined);
      setValue("durationSeconds", undefined);
      setValue("thumbnailUrl", "");
    } else {
      setValue("externalUrl", "");
    }

    if (selectedFormat !== "pdf") {
      setValue("pageCount", undefined);
    }

    if (selectedFormat !== "audio" && selectedFormat !== "video") {
      setValue("durationSeconds", undefined);
    }
  }, [selectedFormat, setValue]);

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

  const processFile = async (file: File) => {
    if (!file || !selectedFormat || selectedFormat === "external_link") return;

    setUploadError("");
    setUploadMessage("");

    setValue("originalFilename", file.name, { shouldDirty: true });
    setValue("mimeType", file.type, { shouldDirty: true });
    setValue("fileSizeBytes", file.size, { shouldDirty: true });

    if (!onUploadFile) {
      setUploadMessage("Archivo detectado. Falta conectar Firebase.");
      return;
    }

    try {
      setIsUploading(true);
      const result = await onUploadFile(file, selectedFormat);

      setValue("storagePath", result.storagePath ?? "", {
        shouldValidate: true,
      });
      setValue("fileUrl", result.fileUrl ?? "", { shouldValidate: true });
      setValue("thumbnailUrl", result.thumbnailUrl ?? "", {
        shouldValidate: true,
      });
      setValue("thumbnailStoragePath", result.thumbnailStoragePath ?? "", {
        shouldValidate: true,
      });

      if (result.pageCount) setValue("pageCount", result.pageCount);
      if (result.durationSeconds)
        setValue("durationSeconds", result.durationSeconds);

      setUploadMessage("¡Archivo procesado con éxito!");
      await trigger(getStepFields(2, selectedFormat));
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Error al procesar",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDropFinal = (e: React.DragEvent) => {
    setIsDragging(false);
    handleDrop(e);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFormatSelection = (format: FormatType) => {
    setValue("format", format, { shouldValidate: true, shouldDirty: true });
    if (step === 1) setStep(2);
  };

  const handleMultiToggle = <
    T extends CEFRLevel | SkillFocus | DeliveryModes | LessonStage,
  >(
    field: "levels" | "skills" | "deliveryModes" | "lessonStages",
    value: T,
  ) => {
    const current = (watch(field) as T[]) ?? [];

    setValue(field, toggleArrayValue(current, value) as never, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRemoveUploadedData = () => {
    setUploadError("");
    setUploadMessage("");
    resetField("storagePath");
    resetField("fileUrl");
    resetField("originalFilename");
    resetField("mimeType");
    resetField("fileSizeBytes");
    resetField("pageCount");
    resetField("durationSeconds");
    resetField("thumbnailUrl");
    resetField("thumbnailStoragePath");
  };

  const handlePickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    // if (!file || !selectedFormat || selectedFormat === "external_link") return;
    // setUploadError("");
    // setUploadMessage("");

    // setValue("originalFilename", file.name, { shouldDirty: true });
    // setValue("mimeType", file.type || "", { shouldDirty: true });
    // setValue("fileSizeBytes", file.size, { shouldDirty: true });

    // if (!onUploadFile) {
    //   setUploadMessage(
    //     "Archivo detectado. Falta conectar onUploadFile para rellenar fileUrl/storagePath automáticamente.",
    //   );
    //   return;
    // }
    // try {
    //   setIsUploading(true);
    //   const result = await onUploadFile(file, selectedFormat);

    //   setValue("storagePath", result.storagePath ?? "", {
    //     shouldValidate: true,
    //   });
    //   setValue("fileUrl", result.fileUrl ?? "", { shouldValidate: true });
    //   setValue("originalFilename", result.originalFilename ?? file.name, {
    //     shouldDirty: true,
    //   });
    //   setValue("mimeType", result.mimeType ?? file.type ?? "", {
    //     shouldDirty: true,
    //   });
    //   setValue("fileSizeBytes", result.fileSizeBytes ?? file.size, {
    //     shouldDirty: true,
    //   });
    //   setValue("pageCount", result.pageCount, { shouldDirty: true });
    //   setValue("durationSeconds", result.durationSeconds, {
    //     shouldDirty: true,
    //   });
    //   setValue("thumbnailUrl", result.thumbnailUrl ?? "", {
    //     shouldValidate: true,
    //   });

    //   setUploadMessage("Archivo procesado correctamente.");
    //   await trigger(getStepFields(2, selectedFormat));
    // } catch (error) {
    //   setUploadError(
    //     error instanceof Error
    //       ? error.message
    //       : "No se pudo procesar el archivo.",
    //   );
    // } finally {
    //   setIsUploading(false);
    // }
  };

  const submitForm = async (rawFormData: z.input<typeof addResourceSchema>) => {
    const formData = rawFormData as AddResourceFormValues;
    const payload: AddResourcePayload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
      visibility: formData.visibility,
      pedagogicalType: formData.pedagogicalType,
      transcriptText: formData.transcriptText?.trim() || undefined,
      levels: formData.levels,
      skills: formData.skills,
      deliveryModes: formData.deliveryModes,
      lessonStage: formData.lessonStages, //?pllural o singular en singular deberia cambiarlo en el modelo tmb?
      grammarTopics: normalizeLooseStringArray(formData.grammarTopicsInput),
      vocabularyTopics: normalizeLooseStringArray(
        formData.vocabularyTopicsInput,
      ),
      tags: normalizeLooseStringArray(formData.tagsInput),
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

    console.log("PAYLOAD FINAL:", payload);
    await onSubmit(payload);
  };

  return (
    <div className="mx-auto w-full max-w-5xl mt-5">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.25)]">
        <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-red-50/40 px-6 py-6 sm:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
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

        <form
          onSubmit={handleSubmit(submitForm)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && step < 4) e.preventDefault();
          }}
          className="grid gap-0 lg:grid-cols-[1.4fr_0.8fr]"
        >
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {step === 1 && (
              <section className="space-y-6">
                <SectionHeader
                  title="¿Qué tipo de material quieres añadir?"
                  description="Selecciona el formato principal. El siguiente paso cambia automáticamente según la elección."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {FORMAT_CARDS.map((card) => {
                    const Icon = card.icon;
                    const selected = values.format === card.value;

                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => handleFormatSelection(card.value)}
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

                <FieldError error={errors.format?.message} />
              </section>
            )}

            {step === 2 && (
              <section className="space-y-6">
                <SectionHeader
                  title="Contenido del recurso"
                  description={
                    selectedFormat === "external_link"
                      ? "Añade la URL del recurso externo."
                      : "Sube el archivo. El formulario puede rellenar automáticamente la metadata técnica."
                  }
                />

                {!selectedFormat && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Primero selecciona un formato en el paso 1.
                  </div>
                )}

                {selectedFormat === "external_link" && (
                  <div className="space-y-4">
                    <FormField
                      label="URL externa"
                      hint="Ejemplo: YouTube, Google Drive, artículo o herramienta web."
                      error={errors.externalUrl?.message}
                    >
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 ps-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          placeholder="https://..."
                          {...register("externalUrl")}
                          className={inputClass(Boolean(errors.externalUrl))}
                        />
                      </div>
                    </FormField>
                  </div>
                )}

                {selectedFormat && selectedFormat !== "external_link" && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            Subida del archivo
                          </div>
                          <div className="text-sm text-slate-600">
                            Formato seleccionado:{" "}
                            <span className="font-medium text-slate-900">
                              {toDisplayLabel(selectedFormat)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => inputFileRef.current?.click()}
                          disabled={isUploading}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UploadCloud className="h-4 w-4" />
                          )}
                          {isUploading
                            ? "Procesando..."
                            : "Seleccionar archivo"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => inputFileRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDropFinal}
                        className="flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <UploadCloud className="mb-3 h-8 w-8 text-slate-400" />
                        <div className="text-sm font-medium text-slate-900">
                          Arrastra aquí o pulsa para elegir archivo
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {selectedFormat === "pdf" &&
                            "PDF con miniatura automática para biblioteca"}
                          {selectedFormat === "image" &&
                            "JPG, PNG, WEBP y otros formatos de imagen"}
                          {selectedFormat === "audio" &&
                            "MP3, WAV, M4A y formatos de audio"}
                          {selectedFormat === "video" &&
                            "MP4, MOV, WEBM y formatos de vídeo"}
                        </div>
                      </button>

                      <input
                        ref={inputFileRef}
                        type="file"
                        accept={getAcceptByFormat(selectedFormat)}
                        className="hidden"
                        onChange={handlePickFile}
                      />

                      {(values.originalFilename ||
                        values.fileUrl ||
                        values.storagePath) && (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-emerald-900">
                                Archivo detectado
                              </div>
                              <div className="text-sm text-emerald-800">
                                {values.originalFilename || "Sin nombre"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleRemoveUploadedData}
                              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 transition hover:bg-emerald-100"
                            >
                              Limpiar
                            </button>
                          </div>

                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <MetaRow
                              label="MIME type"
                              value={values.mimeType || "—"}
                            />
                            <MetaRow
                              label="Tamaño"
                              value={formatBytes(values.fileSizeBytes)}
                            />
                            <MetaRow
                              label="fileUrl"
                              value={
                                values.fileUrl ? "Disponible" : "Pendiente"
                              }
                            />
                            <MetaRow
                              label="storagePath"
                              value={
                                values.storagePath ? "Disponible" : "Pendiente"
                              }
                            />
                            {selectedFormat === "pdf" && (
                              <>
                                <MetaRow
                                  label="thumbnailUrl"
                                  value={
                                    values.thumbnailUrl
                                      ? "Disponible"
                                      : "Pendiente"
                                  }
                                />
                                <MetaRow
                                  label="thumbnailStoragePath"
                                  value={
                                    values.thumbnailStoragePath
                                      ? "Disponible"
                                      : "Pendiente"
                                  }
                                />
                                <MetaRow
                                  label="Páginas"
                                  value={
                                    typeof values.pageCount === "number"
                                      ? String(values.pageCount)
                                      : "Pendiente"
                                  }
                                />
                              </>
                            )}
                            {(selectedFormat === "audio" ||
                              selectedFormat === "video") && (
                              <MetaRow
                                label="Duración"
                                value={
                                  typeof values.durationSeconds === "number"
                                    ? `${values.durationSeconds}s`
                                    : "Pendiente"
                                }
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {uploadMessage && (
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                          {uploadMessage}
                        </div>
                      )}

                      {uploadError && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {uploadError}
                        </div>
                      )}
                    </div>
                    {(selectedFormat === "audio" ||
                      selectedFormat === "video") && (
                      <FormField
                        label="Transcripción"
                        hint="Opcional. Pega el texto completo del audio o vídeo."
                        error={errors.transcriptText?.message}
                      >
                        <textarea
                          rows={6}
                          placeholder="Transcribe here the full content of the audio or video..."
                          {...register("transcriptText")}
                          className={inputClass(Boolean(errors.transcriptText))}
                        />
                      </FormField>
                    )}
                    {!onUploadFile && (
                      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            Modo manual
                          </div>
                          <div className="text-sm text-slate-600">
                            Útil mientras conectas Firebase o tu pipeline de
                            procesamiento.
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            label="fileUrl"
                            hint="URL pública del archivo ya subido."
                            error={errors.fileUrl?.message}
                          >
                            <input
                              type="url"
                              placeholder="https://..."
                              {...register("fileUrl")}
                              className={inputClass(Boolean(errors.fileUrl))}
                            />
                          </FormField>

                          <FormField
                            label="storagePath"
                            hint="Ruta interna en Firebase Storage."
                            error={errors.storagePath?.message}
                          >
                            <input
                              type="text"
                              placeholder="resources/teacher-1/file.pdf"
                              {...register("storagePath")}
                              className={inputClass(
                                Boolean(errors.storagePath),
                              )}
                            />
                          </FormField>

                          <FormField
                            label="originalFilename"
                            error={errors.originalFilename?.message}
                          >
                            <input
                              type="text"
                              placeholder="my-file.pdf"
                              {...register("originalFilename")}
                              className={inputClass(
                                Boolean(errors.originalFilename),
                              )}
                            />
                          </FormField>

                          <FormField
                            label="mimeType"
                            error={errors.mimeType?.message}
                          >
                            <input
                              type="text"
                              placeholder="application/pdf"
                              {...register("mimeType")}
                              className={inputClass(Boolean(errors.mimeType))}
                            />
                          </FormField>

                          <FormField
                            label="fileSizeBytes"
                            error={errors.fileSizeBytes?.message}
                          >
                            <input
                              type="number"
                              placeholder="245000"
                              {...register("fileSizeBytes", {
                                setValueAs: (value) =>
                                  value === "" ? undefined : Number(value),
                              })}
                              className={inputClass(
                                Boolean(errors.fileSizeBytes),
                              )}
                            />
                          </FormField>

                          {selectedFormat === "pdf" && (
                            <>
                              <FormField
                                label="thumbnailUrl"
                                hint="Obligatorio para la miniatura del PDF en biblioteca."
                                error={errors.thumbnailUrl?.message}
                              >
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  {...register("thumbnailUrl")}
                                  className={inputClass(
                                    Boolean(errors.thumbnailUrl),
                                  )}
                                />
                              </FormField>
                              <FormField
                                label="thumbnailStoragePath"
                                hint="Obligatorio para la miniatura del PDF en biblioteca."
                                error={errors.thumbnailStoragePath?.message}
                              >
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  {...register("thumbnailStoragePath")}
                                  className={inputClass(
                                    Boolean(errors.thumbnailStoragePath),
                                  )}
                                />
                              </FormField>

                              <FormField
                                label="pageCount"
                                error={errors.pageCount?.message}
                              >
                                <input
                                  type="number"
                                  placeholder="12"
                                  {...register("pageCount", {
                                    setValueAs: (value) =>
                                      value === "" ? undefined : Number(value),
                                  })}
                                  className={inputClass(
                                    Boolean(errors.pageCount),
                                  )}
                                />
                              </FormField>
                            </>
                          )}

                          {(selectedFormat === "audio" ||
                            selectedFormat === "video") && (
                            <FormField
                              label="durationSeconds"
                              error={errors.durationSeconds?.message}
                            >
                              <input
                                type="number"
                                placeholder="180"
                                {...register("durationSeconds", {
                                  setValueAs: (value) =>
                                    value === "" ? undefined : Number(value),
                                })}
                                className={inputClass(
                                  Boolean(errors.durationSeconds),
                                )}
                              />
                            </FormField>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {step === 3 && (
              <section className="space-y-8">
                <SectionHeader
                  title="Detalles pedagógicos"
                  description="Esta parte marca la diferencia entre una biblioteca caótica y una biblioteca reutilizable."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Título"
                    hint="Nombre corto, claro y fácil de encontrar."
                    error={errors.title?.message}
                    required
                  >
                    <input
                      type="text"
                      placeholder="Past Simple - Reading Worksheet"
                      {...register("title")}
                      className={inputClass(Boolean(errors.title))}
                    />
                  </FormField>

                  <FormField
                    label="Tipo pedagógico"
                    error={errors.pedagogicalType?.message}
                    required
                  >
                    <select
                      {...register("pedagogicalType")}
                      className={inputClass(Boolean(errors.pedagogicalType))}
                    >
                      <option value="">Selecciona una opción</option>
                      {PEDAGOGICAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {toDisplayLabel(type)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField
                  label="Descripción"
                  hint="Contexto, uso sugerido o instrucciones para la profesora."
                  error={errors.description?.message}
                >
                  <textarea
                    rows={5}
                    placeholder="Short explanation, teaching notes, context of use..."
                    {...register("description")}
                    className={inputClass(Boolean(errors.description))}
                  />
                </FormField>

                <div className="grid gap-6 lg:grid-cols-2">
                  <SelectionGroup
                    title="Niveles CEFR"
                    options={CEFR_LEVELS}
                    values={values.levels || []}
                    onToggle={(value) => handleMultiToggle("levels", value)}
                  />

                  <SelectionGroup
                    title="Skills"
                    options={SKILL_FOCUS}
                    values={values.skills || []}
                    onToggle={(value) => handleMultiToggle("skills", value)}
                  />

                  <SelectionGroup
                    title="Modo de entrega"
                    options={DELIVERY_MODES}
                    values={values.deliveryModes || []}
                    onToggle={(value) =>
                      handleMultiToggle("deliveryModes", value)
                    }
                  />

                  <SelectionGroup
                    title="Etapa de la clase"
                    options={LESSON_STAGES}
                    values={values.lessonStages || []}
                    onToggle={(value) =>
                      handleMultiToggle("lessonStages", value)
                    }
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Duración estimada (min)"
                    error={errors.estimatedDurationMinutes?.message}
                  >
                    <input
                      type="number"
                      placeholder="20"
                      {...register("estimatedDurationMinutes", {
                        setValueAs: (value) =>
                          value === "" ? undefined : Number(value),
                      })}
                      className={inputClass(
                        Boolean(errors.estimatedDurationMinutes),
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Dificultad (1-5)"
                    error={errors.difficulty?.message}
                  >
                    <input
                      type="number"
                      min={1}
                      max={5}
                      placeholder="3"
                      {...register("difficulty", {
                        setValueAs: (value) =>
                          value === "" ? undefined : Number(value),
                      })}
                      className={inputClass(Boolean(errors.difficulty))}
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    label="Grammar topics"
                    hint="Separados por comas."
                    error={errors.grammarTopicsInput?.message}
                  >
                    <input
                      type="text"
                      placeholder="past simple, irregular verbs"
                      {...register("grammarTopicsInput")}
                      className={inputClass(Boolean(errors.grammarTopicsInput))}
                    />
                  </FormField>

                  <FormField
                    label="Vocabulary topics"
                    hint="Separados por comas."
                    error={errors.vocabularyTopicsInput?.message}
                  >
                    <input
                      type="text"
                      placeholder="travel, holidays, transport"
                      {...register("vocabularyTopicsInput")}
                      className={inputClass(
                        Boolean(errors.vocabularyTopicsInput),
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Tags"
                    hint="Separados por comas."
                    error={errors.tagsInput?.message}
                  >
                    <input
                      type="text"
                      placeholder="b1, worksheet, exam prep"
                      {...register("tagsInput")}
                      className={inputClass(Boolean(errors.tagsInput))}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CheckboxCard
                    title="Incluye answer key"
                    description="Marca si el recurso tiene soluciones."
                    checked={values.hasAnswerKey || false}
                    onChange={(checked) =>
                      setValue("hasAnswerKey", checked, { shouldDirty: true })
                    }
                  />

                  <CheckboxCard
                    title="Requiere revisión de la profesora"
                    description="Útil para writing tasks, speaking prompts o homework corregible."
                    checked={values.requiresTeacherReview || false}
                    onChange={(checked) =>
                      setValue("requiresTeacherReview", checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-8">
                <SectionHeader
                  title="Revisión y publicación"
                  description="Último repaso antes de guardar el recurso."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Estado" error={errors.status?.message}>
                    <select
                      {...register("status")}
                      className={inputClass(false)}
                    >
                      {RESOURCE_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {toDisplayLabel(status)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label="Visibilidad"
                    error={errors.visibility?.message}
                  >
                    <select
                      {...register("visibility")}
                      className={inputClass(false)}
                    >
                      {RESOURCE_VISIBILITY.map((visibility) => (
                        <option key={visibility} value={visibility}>
                          {toDisplayLabel(visibility)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-base font-semibold text-slate-900">
                    Resumen del recurso
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReviewRow label="Título" value={values.title || "—"} />
                    <ReviewRow
                      label="Formato"
                      value={
                        values.format ? toDisplayLabel(values.format) : "—"
                      }
                    />
                    <ReviewRow
                      label="Tipo pedagógico"
                      value={
                        values.pedagogicalType
                          ? toDisplayLabel(values.pedagogicalType)
                          : "—"
                      }
                    />
                    <ReviewRow
                      label="Estado"
                      value={
                        values.status ? toDisplayLabel(values.status) : "—"
                      }
                    />
                    <ReviewRow
                      label="Visibilidad"
                      value={
                        values.visibility
                          ? toDisplayLabel(values.visibility)
                          : "—"
                      }
                    />
                    <ReviewRow
                      label="Archivo"
                      value={values.originalFilename || "—"}
                    />
                    <ReviewRow
                      label="fileUrl"
                      value={values.fileUrl ? "Sí" : "No"}
                    />
                    <ReviewRow
                      label="thumbnailUrl"
                      value={values.thumbnailUrl ? "Sí" : "No"}
                    />
                    <ReviewRow
                      label="thumbnailStoragePath"
                      value={values.thumbnailStoragePath ? "Sí" : "No"}
                    />
                  </div>

                  <div className="mt-5 space-y-4">
                    <ReviewTags title="Niveles" items={values.levels || []} />
                    <ReviewTags title="Skills" items={values.skills || []} />
                    <ReviewTags
                      title="Delivery"
                      items={values.deliveryModes || []}
                    />
                    <ReviewTags
                      title="Stages"
                      items={values.lessonStages || []}
                    />
                    <ReviewTags
                      title="Grammar topics"
                      items={normalizeLooseStringArray(
                        values.grammarTopicsInput || "",
                      )}
                    />
                    <ReviewTags
                      title="Vocabulary topics"
                      items={normalizeLooseStringArray(
                        values.vocabularyTopicsInput || "",
                      )}
                    />
                    <ReviewTags
                      title="Tags"
                      items={normalizeLooseStringArray(values.tagsInput || "")}
                    />
                  </div>
                </div>
              </section>
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

              {/* <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-3 text-sm font-semibold text-slate-900">
                  Reglas activas
                </div>
                
              </div> */}

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-3 text-sm font-semibold text-slate-900">
                  Vista rápida
                </div>

                <div className="space-y-3 text-sm">
                  <MetaRow
                    label="Formato"
                    value={values.format ? toDisplayLabel(values.format) : "—"}
                  />
                  <MetaRow label="Título" value={values.title || "—"} />
                  <MetaRow
                    label="Archivo"
                    value={values.originalFilename || "—"}
                  />
                  <MetaRow
                    label="Peso"
                    value={formatBytes(values.fileSizeBytes)}
                  />
                  <MetaRow
                    label="Estado"
                    value={values.status ? toDisplayLabel(values.status) : "—"}
                  />
                </div>
              </div>
            </div>
          </aside>
        </form>
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
      return ["title", "pedagogicalType"] as const;

    case 4:
      return ["status", "visibility"] as const;

    default:
      return [] as const;
  }
}
function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
    hasError
      ? "border-red-300 ring-2 ring-red-100"
      : "border-slate-200 focus:border-slate-400",
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
        {label}
        {required && <span className="text-red-600">*</span>}
      </div>
      {children}
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      <FieldError error={error} />
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-2 text-sm text-red-600">{error}</p>;
}

function SelectionGroup<T extends string>({
  title,
  options,
  values,
  onToggle,
}: {
  title: string;
  options: readonly T[];
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={cn(
                "rounded-full border px-3 py-2 text-sm transition",
                selected
                  ? "border-[#9e2727] bg-red-50 text-[#9e2727]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              {toDisplayLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckboxCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-start gap-4 rounded-3xl border p-5 text-left transition",
        checked
          ? "border-[#9e2727] bg-red-50"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <div
        className={cn(
          "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border",
          checked
            ? "border-[#9e2727] bg-[#9e2727] text-white"
            : "border-slate-300 bg-white text-transparent",
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </div>

      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">
          {description}
        </div>
      </div>
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function ReviewTags({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              {toDisplayLabel(item)}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">Sin datos</span>
        )}
      </div>
    </div>
  );
}
