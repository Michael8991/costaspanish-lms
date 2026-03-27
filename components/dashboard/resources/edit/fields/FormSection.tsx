"use client";

import {
  CEFRLevel,
  DeliveryModes,
  LessonStage,
  PEDAGOGICAL_TYPES,
  RESOURCE_STATUS,
  RESOURCE_VISIBILITY,
  SkillFocus,
} from "@/lib/constants/resource.constants";
import { ResourceDetailDTO } from "@/lib/dto/resource.dto";
import { useRouter } from "next/navigation";
import { Path, PathValue, useForm } from "react-hook-form";
import { cn, toDisplayLabel } from "@/lib/utils/form-helpers";
import { Field } from "./Field";
import ToggleGroupField from "./ToggleGroupField";
import {
  UpdateResourceInput,
  updateResourceSchema,
} from "@/lib/validators/resource";
import SidebarInfo from "./SidebarInfo";
import CheckToggleField from "./CheckToggleField";

interface EditResourceFormProps {
  locale: string;
  resource: ResourceDetailDTO;
}

export type EditFormValues = {
  title?: string;
  description?: string;
  status?: (typeof RESOURCE_STATUS)[number];
  visibility?: (typeof RESOURCE_VISIBILITY)[number];
  pedagogicalType?: (typeof PEDAGOGICAL_TYPES)[number];
  levels?: CEFRLevel[];
  skills?: SkillFocus[];
  deliveryModes?: DeliveryModes[];
  lessonStages?: LessonStage[];
  grammarTopics?: string[];
  vocabularyTopics?: string[];
  tags?: string[];
  estimatedDurationMinutes?: number;
  difficulty?: number;
  hasAnswerKey?: boolean;
  requiresTeacherReview?: boolean;
  transcriptText?: string;
  // inputs de texto para los array de strings
  grammarTopicsInput: string;
  vocabularyTopicsInput: string;
  tagsInput: string;
};

const inputClass = (hasError = false) =>
  cn(
    "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
    hasError
      ? "border-red-300 ring-2 ring-red-100"
      : "border-slate-200 focus:border-slate-400",
  );

export default function FormSection({
  locale,
  resource,
}: EditResourceFormProps) {
  const router = useRouter();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditFormValues>({
    values: {
      title: resource?.title || "",
      description: resource.description ?? "",
      status: resource.status,
      visibility: resource.visibility,
      pedagogicalType: resource.pedagogicalType,
      levels: resource.levels ?? [],
      skills: resource.skills ?? [],
      deliveryModes: resource.deliveryModes ?? [],
      lessonStages: resource.lessonStages ?? [],
      // Arrays de strings como inputs de texto separados por comas
      grammarTopicsInput: resource.grammarTopics?.join(", ") ?? "",
      vocabularyTopicsInput: resource.vocabularyTopics?.join(", ") ?? "",
      tagsInput: resource.tags?.join(", ") ?? "",
      estimatedDurationMinutes: resource.estimatedDurationMinutes,
      difficulty: resource.difficulty,
      hasAnswerKey: resource.hasAnswerKey,
      requiresTeacherReview: resource.requiresTeacherReview,
      transcriptText: resource.storage?.transcriptText ?? "",
    },
  });

  const values = watch();

  const toggleField = (field: Path<EditFormValues>, value: string) => {
    const current = (watch(field) as string[]) ?? [];

    const newValues = current.includes(value)
      ? current.filter((i) => i !== value)
      : [...current, value];

    setValue(
      field,
      newValues as PathValue<EditFormValues, Path<EditFormValues>>,
      {
        shouldDirty: true,
      },
    );
  };

  const parseCommaInput = (input: string): string[] => [
    ...new Set(
      input
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  const onSubmit = async (data: EditFormValues) => {
    const payload: UpdateResourceInput = {
      title: data.title,
      description: data.description,
      status: data.status,
      visibility: data.visibility,
      pedagogicalType: data.pedagogicalType,
      levels: data.levels,
      skills: data.skills,
      deliveryModes: data.deliveryModes,
      lessonStages: data.lessonStages,
      grammarTopics: parseCommaInput(data.grammarTopicsInput),
      vocabularyTopics: parseCommaInput(data.vocabularyTopicsInput),
      tags: parseCommaInput(data.tagsInput),
      estimatedDurationMinutes: data.estimatedDurationMinutes,
      difficulty: data.difficulty,
      hasAnswerKey: data.hasAnswerKey,
      requiresTeacherReview: data.requiresTeacherReview,
      transcriptText: data.transcriptText || "",
    };

    // Validamos contra updateResourceSchema antes de enviar
    const parsed = updateResourceSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error.issues);
      return;
    }

    const res = await fetch(`/api/resources/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("API error:", err);
      return;
    }

    router.push(`/${locale}/dashboard/resources/${resource.id}`);
    router.refresh();
  };

  const isAudioVideo =
    resource.asset.format === "audio" || resource.asset.format === "video";

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]"
      >
        {/* ── Columna principal ── */}
        <div className="flex flex-col gap-5">
          {/* Identidad */}

          <ToggleGroupField
            resource={values}
            onToggle={toggleField}
            register={register}
            errors={errors}
          />

          {/* Opciones */}
          <CheckToggleField resource={values} setValue={setValue} />

          {/* Transcripción — solo audio/video */}
          {isAudioVideo && (
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Transcripción
                </h2>
              </div>
              <Field
                label="Texto completo"
                hint="Opcional. Transcripción del audio o vídeo."
                error={errors.transcriptText?.message}
              >
                <textarea
                  rows={8}
                  placeholder="Paste the full transcript here..."
                  {...register("transcriptText")}
                  className={inputClass(Boolean(errors.transcriptText))}
                />
              </Field>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <SidebarInfo
          resource={resource}
          errors={errors}
          isDirty={isDirty}
          register={register}
          isSubmitting={isSubmitting}
        />
      </form>
    </>
  );
}
