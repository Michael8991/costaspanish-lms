"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useForm,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  BookOpen,
  BadgeInfo,
  LayoutTemplate,
  ListTree,
} from "lucide-react";

import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import { createCourseTemplateSchema } from "@/lib/validators/courseTemplate.validator";
import {
  COURSETEMPLATE_STATUS,
  CURRENCY_CODES,
  PARTICIPANT_MODES,
  STORE_FRONT_PRICE_MODE,
} from "@/lib/constants/courseTemplate.constants";
import { CEFR_LEVELS } from "@/lib/constants/resource.constants";
import z from "zod";

type CourseTemplateFormProps = {
  locale: string;
  initialData?: CourseTemplateDetailDTO | null;
  submitLabel?: string;
  endpoint?: string;
};

export type CourseTemplateFormValues = z.input<
  typeof createCourseTemplateSchema
>;

export type CourseTemplateSubmitValues = z.output<
  typeof createCourseTemplateSchema
>;

const numberInputTransform = {
  setValueAs: (value: string) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
};

function getEmptyPriceOption(): CourseTemplateSubmitValues["storefront"]["priceOptions"][number] {
  return {
    label: "",
    amount: undefined,
    condition: {
      participantMode: undefined,
      participantCount: undefined,
      packageClasses: undefined,
      monthlyClasses: undefined,
    },
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
  };
}

function getEmptyModule(): CourseTemplateSubmitValues["curriculum"]["modules"][number] {
  return {
    title: "",
    durationLabel: "",
    type: "",
    submodules: [],
  };
}

function getEmptySubmodule(): CourseTemplateSubmitValues["curriculum"]["modules"][number]["submodules"][number] {
  return {
    title: "",
    type: "",
    durationLabel: "",
  };
}

function getDefaultValues(
  initialData?: CourseTemplateDetailDTO | null,
): CourseTemplateFormValues {
  if (!initialData) {
    return {
      code: "",
      internalName: "",
      status: "draft",
      version: 1,
      pedagogicalMeta: {
        level: "A1",
        category: "",
        objectives: [],
        methodology: "",
        estimatedDurationLabel: "",
        targetAudience: "",
      },
      storefront: {
        isPublished: false,
        publicTitle: "",
        shortDescription: "",
        longDescription: "",
        seoTitle: "",
        seoDescription: "",
        promoVideoUrl: "",
        benefits: [],
        priceMode: "custom_label",
        priceOptions: [],
        currency: "EUR",
        heroImageUrl: "",
        thumbnailUrl: "",
        ctaText: "",
      },
      curriculum: {
        modules: [],
        units: [],
      },
    };
  }

  return {
    code: initialData.code ?? "",
    internalName: initialData.internalName ?? "",
    status: initialData.status ?? "draft",
    version: initialData.version ?? 1,
    pedagogicalMeta: {
      level: initialData.pedagogicalMeta.level,
      category: initialData.pedagogicalMeta.category ?? "",
      objectives: initialData.pedagogicalMeta.objectives ?? [],
      methodology: initialData.pedagogicalMeta.methodology ?? "",
      estimatedDurationLabel:
        initialData.pedagogicalMeta.estimatedDurationLabel ?? "",
      targetAudience: initialData.pedagogicalMeta.targetAudience ?? "",
    },
    storefront: {
      isPublished: initialData.storefront.isPublished ?? false,
      publicTitle: initialData.storefront.publicTitle ?? "",
      shortDescription: initialData.storefront.shortDescription ?? "",
      longDescription: initialData.storefront.longDescription ?? "",
      seoTitle: initialData.storefront.seoTitle ?? "",
      seoDescription: initialData.storefront.seoDescription ?? "",
      promoVideoUrl: initialData.storefront.promoVideoUrl ?? "",
      benefits: initialData.storefront.benefits ?? [],
      priceMode: initialData.storefront.priceMode ?? "custom_label",
      priceOptions: (initialData.storefront.priceOptions ?? []).map(
        (option) => ({
          label: option.label,
          amount: option.amount,
          condition: option.condition
            ? {
                participantMode: option.condition.participantMode,
                participantCount: option.condition.participantCount,
                packageClasses: option.condition.packageClasses,
                monthlyClasses: option.condition.monthlyClasses,
              }
            : undefined,
          isFeatured: option.isFeatured ?? false,
          isActive: option.isActive ?? true,
          sortOrder: option.sortOrder ?? 0,
        }),
      ),
      currency: initialData.storefront.currency ?? "EUR",
      heroImageUrl: initialData.storefront.heroImageUrl ?? "",
      thumbnailUrl: initialData.storefront.thumbnailUrl ?? "",
      ctaText: initialData.storefront.ctaText ?? "",
    },
    curriculum: {
      modules: (initialData.curriculum?.modules ?? []).map((module) => ({
        title: module.title,
        durationLabel: module.durationLabel ?? "",
        type: module.type ?? "",
        submodules: (module.submodules ?? []).map((submodule) => ({
          title: submodule.title,
          type: submodule.type ?? "",
          durationLabel: submodule.durationLabel ?? "",
        })),
      })),
      units: initialData.curriculum?.units ?? [],
    },
  };
}

function normalizeBeforeSubmit(
  values: CourseTemplateFormValues,
): CourseTemplateSubmitValues {
  const priceMode = values.storefront?.priceMode ?? "custom_label";

  return {
    code: (values.code ?? "").trim().toUpperCase(),
    internalName: (values.internalName ?? "").trim(),
    status: values.status ?? "draft",
    version: values.version ?? 1,

    pedagogicalMeta: {
      level: values.pedagogicalMeta.level,
      category: (values.pedagogicalMeta.category ?? "").trim(),
      objectives: values.pedagogicalMeta.objectives ?? [],
      methodology: values.pedagogicalMeta.methodology,
      estimatedDurationLabel: values.pedagogicalMeta.estimatedDurationLabel,
      targetAudience: values.pedagogicalMeta.targetAudience,
    },

    storefront: {
      isPublished: values.storefront?.isPublished ?? false,
      publicTitle: (values.storefront?.publicTitle ?? "").trim(),
      shortDescription: (values.storefront?.shortDescription ?? "").trim(),
      longDescription: values.storefront?.longDescription,
      seoTitle: values.storefront?.seoTitle,
      seoDescription: values.storefront?.seoDescription,
      promoVideoUrl: values.storefront?.promoVideoUrl ?? undefined,
      benefits: values.storefront?.benefits ?? [],
      priceMode,
      priceOptions: (values.storefront?.priceOptions ?? []).map((option) => ({
        label: (option.label ?? "").trim(),
        amount: priceMode === "free" ? 0 : option.amount,
        condition: option.condition
          ? {
              participantMode: option.condition.participantMode,
              participantCount: option.condition.participantCount,
              packageClasses: option.condition.packageClasses,
              monthlyClasses: option.condition.monthlyClasses,
            }
          : undefined,
        isFeatured: option.isFeatured ?? false,
        isActive: option.isActive ?? true,
        sortOrder: option.sortOrder ?? 0,
      })),
      currency: values.storefront?.currency ?? "EUR",
      heroImageUrl: values.storefront?.heroImageUrl || undefined,
      thumbnailUrl: values.storefront?.thumbnailUrl,
      ctaText: values.storefront?.ctaText,
    },

    curriculum: {
      modules: (values.curriculum?.modules ?? []).map((module) => ({
        title: (module.title ?? "").trim(),
        durationLabel: module.durationLabel,
        type: module.type,
        submodules: (module.submodules ?? []).map((submodule) => ({
          title: (submodule.title ?? "").trim(),
          type: submodule.type,
          durationLabel: submodule.durationLabel,
        })),
      })),
      units: values.curriculum?.units ?? [],
    },
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/60 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#9e2727] flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ModuleFields({
  moduleIndex,
  control,
  register,
  errors,
  removeModule,
}: {
  moduleIndex: number;
  control: Control<CourseTemplateFormValues>;
  register: UseFormRegister<CourseTemplateFormValues>;
  errors: FieldErrors<CourseTemplateFormValues>;
  removeModule: (index: number) => void;
}) {
  const {
    fields: submoduleFields,
    append: appendSubmodule,
    remove: removeSubmodule,
  } = useFieldArray({
    control,
    name: `curriculum.modules.${moduleIndex}.submodules`,
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium text-gray-900">Module {moduleIndex + 1}</h4>
        <button
          type="button"
          onClick={() => removeModule(moduleIndex)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
        >
          <Trash2 size={16} />
          Remove module
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Module title
          </label>
          <input
            {...register(`curriculum.modules.${moduleIndex}.title`)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="Module title"
          />
          <FieldError
            message={
              errors.curriculum?.modules?.[moduleIndex]?.title?.message as
                | string
                | undefined
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Duration label
          </label>
          <input
            {...register(`curriculum.modules.${moduleIndex}.durationLabel`)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="8 weeks / 12h / 1 month"
          />
          <FieldError
            message={
              errors.curriculum?.modules?.[moduleIndex]?.durationLabel
                ?.message as string | undefined
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type
          </label>
          <input
            {...register(`curriculum.modules.${moduleIndex}.type`)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="Grammar / Speaking / Exam prep"
          />
          <FieldError
            message={
              errors.curriculum?.modules?.[moduleIndex]?.type?.message as
                | string
                | undefined
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-medium text-gray-800">Submodules</h5>
          <button
            type="button"
            onClick={() => appendSubmodule(getEmptySubmodule())}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-white transition-colors text-sm"
          >
            <Plus size={16} />
            Add submodule
          </button>
        </div>

        {submoduleFields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
            No submodules yet.
          </div>
        ) : null}

        {submoduleFields.map((submodule, subIndex) => (
          <div
            key={submodule.id}
            className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 rounded-lg border border-gray-200 bg-white p-3"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title
              </label>
              <input
                {...register(
                  `curriculum.modules.${moduleIndex}.submodules.${subIndex}.title`,
                )}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                placeholder="Submodule title"
              />
              <FieldError
                message={
                  errors.curriculum?.modules?.[moduleIndex]?.submodules?.[
                    subIndex
                  ]?.title?.message as string | undefined
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <input
                {...register(
                  `curriculum.modules.${moduleIndex}.submodules.${subIndex}.type`,
                )}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                placeholder="Listening / Review"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Duration
              </label>
              <input
                {...register(
                  `curriculum.modules.${moduleIndex}.submodules.${subIndex}.durationLabel`,
                )}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                placeholder="45 min"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeSubmodule(subIndex)}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function addStringItem(
  items: string[] | undefined,
  setter: (next: string[]) => void,
) {
  setter([...(items ?? []), ""]);
}

function removeStringItem(
  items: string[] | undefined,
  index: number,
  setter: (next: string[]) => void,
) {
  setter((items ?? []).filter((_, i) => i !== index));
}

export default function CourseTemplateForm({
  locale,
  initialData,
  submitLabel = "Create template",
  endpoint = "/api/course-template",
}: CourseTemplateFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo(
    () => getDefaultValues(initialData),
    [initialData],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CourseTemplateFormValues>({
    resolver: zodResolver(createCourseTemplateSchema),
    defaultValues,
    mode: "onBlur",
  });

  const objectives = watch("pedagogicalMeta.objectives") ?? [];
  const benefits = watch("storefront.benefits") ?? [];
  const units = watch("curriculum.units") ?? [];

  const priceOptionsArray = useFieldArray({
    control,
    name: "storefront.priceOptions",
  });

  const modulesArray = useFieldArray({
    control,
    name: "curriculum.modules",
  });

  const priceMode = watch("storefront.priceMode");

  const onSubmit = async (rawValues: CourseTemplateFormValues) => {
    setSubmitError(null);

    try {
      const payload: CourseTemplateSubmitValues =
        createCourseTemplateSchema.parse(normalizeBeforeSubmit(rawValues));

      console.log("SUBMIT PAYLOAD", payload);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      console.log("SERVER RESPONSE", data);

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Unable to create course template",
        );
      }

      router.push(`/${locale}/dashboard/courses`);
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unexpected error while saving template",
      );
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
      <SectionCard
        title="Basic Information"
        description="Internal identity and lifecycle status of the template."
        icon={LayoutTemplate}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Code
            </label>
            <input
              {...register("code")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="ESP-B2-INTENSIVE"
            />
            <FieldError message={errors.code?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Internal name
            </label>
            <input
              {...register("internalName")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Spanish B2 Intensive"
            />
            <FieldError message={errors.internalName?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              {...register("status")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            >
              {COURSETEMPLATE_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <FieldError message={errors.status?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Version
            </label>
            <input
              type="number"
              min={1}
              {...register("version", numberInputTransform)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            />
            <FieldError message={errors.version?.message} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Pedagogical Meta"
        description="Academic framing, objectives and instructional context."
        icon={BadgeInfo}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Level
            </label>
            <select
              {...register("pedagogicalMeta.level")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            >
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <FieldError message={errors.pedagogicalMeta?.level?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category
            </label>
            <input
              {...register("pedagogicalMeta.category")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="General Spanish / Exam prep / Business"
            />
            <FieldError message={errors.pedagogicalMeta?.category?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Estimated duration
            </label>
            <input
              {...register("pedagogicalMeta.estimatedDurationLabel")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="12 weeks / 24 sessions"
            />
            <FieldError
              message={errors.pedagogicalMeta?.estimatedDurationLabel?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Target audience
            </label>
            <input
              {...register("pedagogicalMeta.targetAudience")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Adults / Teenagers / Professionals"
            />
            <FieldError
              message={errors.pedagogicalMeta?.targetAudience?.message}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Methodology
          </label>
          <textarea
            {...register("pedagogicalMeta.methodology")}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="Describe communicative approach, task-based learning, flipped classroom, etc."
          />
          <FieldError message={errors.pedagogicalMeta?.methodology?.message} />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-800">Objectives</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add each objective as a separate item.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setValue("pedagogicalMeta.objectives", [...objectives, ""], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <Plus size={16} />
              Add objective
            </button>
          </div>

          {objectives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              No objectives added yet.
            </div>
          ) : null}

          {objectives.map((_, index) => (
            <div
              key={`objective-${index}`}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
            >
              <div>
                <input
                  {...register(`pedagogicalMeta.objectives.${index}`)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                  placeholder={`Objective ${index + 1}`}
                />
                <FieldError
                  message={
                    errors.pedagogicalMeta?.objectives?.[index]?.message as
                      | string
                      | undefined
                  }
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setValue(
                    "pedagogicalMeta.objectives",
                    objectives.filter((_, i) => i !== index),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Storefront"
        description="Public-facing copy, positioning, pricing and media."
        icon={BookOpen}
      >
        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register("storefront.isPublished")}
              className="rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
            />
            Published in storefront
          </label>
          <FieldError message={errors.storefront?.isPublished?.message} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Public title
            </label>
            <input
              {...register("storefront.publicTitle")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Learn Spanish B2 with confidence"
            />
            <FieldError message={errors.storefront?.publicTitle?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Price mode
            </label>
            <select
              {...register("storefront.priceMode")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            >
              {STORE_FRONT_PRICE_MODE.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
            <FieldError message={errors.storefront?.priceMode?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Currency
            </label>
            <select
              {...register("storefront.currency")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            >
              {CURRENCY_CODES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <FieldError message={errors.storefront?.currency?.message} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Short description
            </label>
            <textarea
              {...register("storefront.shortDescription")}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Concise overview for cards, lists and hero sections."
            />
            <FieldError
              message={errors.storefront?.shortDescription?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Long description
            </label>
            <textarea
              {...register("storefront.longDescription")}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Extended positioning and promise of the program."
            />
            <FieldError message={errors.storefront?.longDescription?.message} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              SEO title
            </label>
            <input
              {...register("storefront.seoTitle")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="SEO title"
            />
            <FieldError message={errors.storefront?.seoTitle?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              SEO description
            </label>
            <input
              {...register("storefront.seoDescription")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="SEO description"
            />
            <FieldError message={errors.storefront?.seoDescription?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Promo video URL
            </label>
            <input
              {...register("storefront.promoVideoUrl")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="https://..."
            />
            <FieldError message={errors.storefront?.promoVideoUrl?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              CTA text
            </label>
            <input
              {...register("storefront.ctaText")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Book now / Reserve your spot"
            />
            <FieldError message={errors.storefront?.ctaText?.message} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hero image URL
            </label>
            <input
              {...register("storefront.heroImageUrl")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="https://..."
            />
            <FieldError message={errors.storefront?.heroImageUrl?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Thumbnail URL
            </label>
            <input
              {...register("storefront.thumbnailUrl")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="/images/templates/b2-intensive-cover.jpg"
            />
            <FieldError message={errors.storefront?.thumbnailUrl?.message} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-800">Benefits</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Public bullet points for the landing/storefront.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setValue("storefront.benefits", [...benefits, ""], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <Plus size={16} />
              Add benefit
            </button>
          </div>

          {benefits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              No benefits added yet.
            </div>
          ) : null}

          {benefits.map((_, index) => (
            <div
              key={`benefits-${index}`}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
            >
              <div>
                <input
                  {...register(`storefront.benefits.${index}`)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                  placeholder={`Benefit ${index + 1}`}
                />
                <FieldError
                  message={
                    errors.storefront?.benefits?.[index]?.message as
                      | string
                      | undefined
                  }
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setValue(
                    "storefront.benefits",
                    benefits.filter((_, i) => i !== index),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-800">
                Price options
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Supports monthly, package, free or custom label logic.
              </p>
            </div>

            <button
              type="button"
              onClick={() => priceOptionsArray.append(getEmptyPriceOption())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <Plus size={16} />
              Add price option
            </button>
          </div>

          {priceOptionsArray.fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              No price options yet.
            </div>
          ) : null}

          {priceOptionsArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium text-gray-900">
                  Price option {index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => priceOptionsArray.remove(index)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Label
                  </label>
                  <input
                    {...register(`storefront.priceOptions.${index}.label`)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder="8 classes pack"
                  />
                  <FieldError
                    message={
                      errors.storefront?.priceOptions?.[index]?.label
                        ?.message as string | undefined
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={priceMode === "free"}
                    {...register(
                      `storefront.priceOptions.${index}.amount`,
                      numberInputTransform,
                    )}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder={priceMode === "free" ? "0" : "99"}
                  />
                  <FieldError
                    message={
                      errors.storefront?.priceOptions?.[index]?.amount
                        ?.message as string | undefined
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Participant mode
                  </label>
                  <select
                    {...register(
                      `storefront.priceOptions.${index}.condition.participantMode`,
                    )}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                  >
                    <option value="">—</option>
                    {PARTICIPANT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Participant count
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register(
                      `storefront.priceOptions.${index}.condition.participantCount`,
                      numberInputTransform,
                    )}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Package classes
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register(
                      `storefront.priceOptions.${index}.condition.packageClasses`,
                      numberInputTransform,
                    )}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder="8"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Monthly classes
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register(
                      `storefront.priceOptions.${index}.condition.monthlyClasses`,
                      numberInputTransform,
                    )}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder="8"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      {...register(
                        `storefront.priceOptions.${index}.isFeatured`,
                      )}
                      className="rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
                    />
                    Featured
                  </label>
                </div>

                <div className="flex items-end gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      {...register(`storefront.priceOptions.${index}.isActive`)}
                      className="rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
                    />
                    Active
                  </label>

                  <div className="w-full max-w-[140px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sort order
                    </label>
                    <input
                      type="number"
                      min={0}
                      {...register(
                        `storefront.priceOptions.${index}.sortOrder`,
                        numberInputTransform,
                      )}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Curriculum"
        description="Program structure: units, modules and optional submodules."
        icon={ListTree}
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-800">Units</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  High-level milestones or chapters.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setValue("curriculum.units", [...units, ""], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                <Plus size={16} />
                Add unit
              </button>
            </div>

            {units.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
                No units added yet.
              </div>
            ) : null}

            {units.map((_, index) => (
              <div
                key={`units-${index}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
              >
                <div>
                  <input
                    {...register(`curriculum.units.${index}`)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder={`Unit ${index + 1}`}
                  />
                  <FieldError
                    message={
                      errors.curriculum?.units?.[index]?.message as
                        | string
                        | undefined
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setValue(
                      "curriculum.units",
                      units.filter((_, i) => i !== index),
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-800">Modules</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Detailed program blocks with optional submodules.
                </p>
              </div>

              <button
                type="button"
                onClick={() => modulesArray.append(getEmptyModule())}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                <Plus size={16} />
                Add module
              </button>
            </div>

            {modulesArray.fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
                No modules added yet.
              </div>
            ) : null}

            <div className="space-y-4">
              {modulesArray.fields.map((field, moduleIndex) => (
                <ModuleFields
                  key={field.id}
                  moduleIndex={moduleIndex}
                  control={control}
                  register={register}
                  errors={errors}
                  removeModule={modulesArray.remove}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="sticky bottom-4 z-10">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Validate internally with Zod before sending the payload to the API.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/dashboard/courses`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9e2727] text-white hover:bg-[#8d2121] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
