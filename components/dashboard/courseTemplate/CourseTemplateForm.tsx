"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
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
  ChevronDown,
  Settings2,
} from "lucide-react";

import type { CourseTemplateDetailDTO } from "@/lib/dto/course-template.dto";
import CourseTemplateLessonsEditor, {
  createEditableCourseTemplateModule,
  createEditableCourseTemplateModules,
  removeLessonClientIds,
  type EditableModuleData,
} from "@/components/dashboard/courses/templates/CourseTemplateLessonsEditor";
import CourseTemplateOperationalDefaultsFields from "@/components/dashboard/courseTemplate/CourseTemplateOperationalDefaultsFields";
import {
  useResourcesByIds,
  type ResourceMap,
} from "@/lib/hooks/useResourcesByIds";
import { createCourseTemplateSchema } from "@/lib/validators/courseTemplate.validator";
import {
  COURSETEMPLATE_STATUS,
  CURRENCY_CODES,
  PARTICIPANT_MODES,
  STORE_FRONT_PRICE_MODE,
} from "@/lib/constants/courseTemplate.constants";
import { CEFR_LEVELS } from "@/lib/constants/resource.constants";
import {
  getCourseTemplatePriceModeLabel,
  getCourseTemplateStatusVisual,
  getParticipantModeLabel,
} from "@/lib/utils/course-template-visuals";
import { normalizeBlockCategories } from "@/lib/utils/lesson-block-categories";
import z from "zod";
import { toast } from "sonner";
import type { ImportedLessonResult } from "@/components/dashboard/courses/templates/SaveLessonAsTemplateModal";

type CourseTemplateFormProps = {
  locale: string;
  initialData?: CourseTemplateDetailDTO | null;
  submitLabel?: string;
  endpoint?: string;
  method?: "POST" | "PATCH";
  redirectTo?: string;
  cancleHref?: string;
};

export type CourseTemplateFormValues = z.input<
  typeof createCourseTemplateSchema
>;

export type CourseTemplateSubmitValues = z.output<
  typeof createCourseTemplateSchema
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findFirstErrorMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findFirstErrorMessage(item);
      if (message) return message;
    }
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      const message = findFirstErrorMessage(item);
      if (message) return message;
    }
  }

  return null;
}

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const error =
    typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : null;
  const validationMessage = findFirstErrorMessage(payload.details);

  if (error && validationMessage) return `${error}: ${validationMessage}`;
  return error ?? validationMessage ?? fallback;
}

function getCreatedTemplateId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  for (const key of ["data", "item"] as const) {
    const candidate = payload[key];
    if (isRecord(candidate) && typeof candidate.id === "string") {
      return candidate.id;
    }
  }

  return null;
}

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
    description: "",
    durationLabel: "",
    type: "",
    order: 0,
    objectives: [],
    lessons: [],
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
      operationalDefaults: {
        lessonDefaults: {
          durationMinutes: 60,
          timezone: "Europe/Madrid",
          defaultClassType: "private",
        },
        schedulingDefaults: {
          frequency: "weekly",
          sessionsPerWeek: 1,
          preferredWeekdays: [],
          allowRecurringLessons: true,
        },
        creditPolicy: {
          creditsPerLesson: 1,
          consumeOn: "completion",
          trialConsumesCredit: false,
          cancellationConsumesCredit: false,
          noShowConsumesCredit: true,
        },
        participantPolicy: {
          participantMode: "solo",
          minStudents: 1,
          maxStudents: 1,
        },
        preparationPolicy: {
          copyTemplateBlocksToLesson: true,
          copyTemplateResourcesToLesson: true,
          defaultPreparationStatus: "needs_preparation",
        },
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
    operationalDefaults: {
      lessonDefaults: {
        durationMinutes:
          initialData.operationalDefaults.lessonDefaults.durationMinutes,
        timezone: initialData.operationalDefaults.lessonDefaults.timezone,
        defaultClassType:
          initialData.operationalDefaults.lessonDefaults.defaultClassType,
      },
      schedulingDefaults: {
        frequency:
          initialData.operationalDefaults.schedulingDefaults.frequency,
        sessionsPerWeek:
          initialData.operationalDefaults.schedulingDefaults.sessionsPerWeek,
        preferredWeekdays: [
          ...initialData.operationalDefaults.schedulingDefaults
            .preferredWeekdays,
        ],
        allowRecurringLessons:
          initialData.operationalDefaults.schedulingDefaults
            .allowRecurringLessons,
      },
      creditPolicy: {
        creditsPerLesson:
          initialData.operationalDefaults.creditPolicy.creditsPerLesson,
        consumeOn: initialData.operationalDefaults.creditPolicy.consumeOn,
        trialConsumesCredit:
          initialData.operationalDefaults.creditPolicy.trialConsumesCredit,
        cancellationConsumesCredit:
          initialData.operationalDefaults.creditPolicy
            .cancellationConsumesCredit,
        noShowConsumesCredit:
          initialData.operationalDefaults.creditPolicy.noShowConsumesCredit,
      },
      participantPolicy: {
        participantMode:
          initialData.operationalDefaults.participantPolicy.participantMode,
        minStudents:
          initialData.operationalDefaults.participantPolicy.minStudents,
        maxStudents:
          initialData.operationalDefaults.participantPolicy.maxStudents,
      },
      preparationPolicy: {
        copyTemplateBlocksToLesson:
          initialData.operationalDefaults.preparationPolicy
            .copyTemplateBlocksToLesson,
        copyTemplateResourcesToLesson:
          initialData.operationalDefaults.preparationPolicy
            .copyTemplateResourcesToLesson,
        defaultPreparationStatus:
          initialData.operationalDefaults.preparationPolicy
            .defaultPreparationStatus,
      },
    },
    curriculum: {
      modules: (initialData.curriculum?.modules ?? []).map((module) => ({
        title: module.title,
        description: module.description ?? "",
        durationLabel: module.durationLabel ?? "",
        type: module.type ?? "",
        order: module.order ?? 0,
        objectives: module.objectives ?? [],
        lessons: (module.lessons ?? []).map((lesson) => ({
          title: lesson.title,
          description: lesson.description ?? "",
          order: lesson.order ?? 0,
          estimatedMinutes: lesson.estimatedMinutes,
          objectives: lesson.objectives ?? [],
          teacherNotes: lesson.teacherNotes ?? "",
          blocks: (lesson.blocks ?? []).map((block) => ({
            title: block.title,
            type: block.type,
            categories: block.categories ?? [],
            plannedContent: block.plannedContent ?? "",
            plannedObjectives: block.plannedObjectives ?? [],
            estimatedMinutes: block.estimatedMinutes,
            cefrLevels: block.cefrLevels ?? [],
            skills: block.skills ?? [],
            tags: block.tags ?? [],
            resources: Array.from(
              new Set(
                (block.resources ?? [])
                  .map((resourceId) => String(resourceId).trim())
                  .filter(Boolean),
              ),
            ),
            order: block.order ?? 0,
          })),
        })),
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

function normalizeCourseTemplateCurriculumForSubmit(
  curriculum: CourseTemplateFormValues["curriculum"],
): CourseTemplateSubmitValues["curriculum"] {
  const normalizeTextItems = (items?: string[]) =>
    Array.from(
      new Set((items ?? []).map((item) => item.trim()).filter(Boolean)),
    );

  return {
    modules: (curriculum?.modules ?? []).map((module, moduleIndex) => ({
      title: (module.title ?? "").trim(),
      description: module.description,
      durationLabel: module.durationLabel,
      type: module.type,
      order: moduleIndex,
      objectives: normalizeTextItems(module.objectives),
      lessons: (module.lessons ?? []).map((lesson, lessonIndex) => ({
        title: (lesson.title ?? "").trim(),
        description: lesson.description?.trim() || undefined,
        order: lessonIndex,
        estimatedMinutes: lesson.estimatedMinutes,
        objectives: normalizeTextItems(lesson.objectives),
        teacherNotes: lesson.teacherNotes?.trim() || undefined,
        blocks: (lesson.blocks ?? []).map((block, blockIndex) => {
          const type = (block.type ?? "").trim() || "custom";
          const estimatedMinutes =
            typeof block.estimatedMinutes === "number" &&
            Number.isFinite(block.estimatedMinutes)
              ? block.estimatedMinutes
              : undefined;

          return {
            title: (block.title ?? "").trim(),
            type,
            categories: normalizeBlockCategories(
              type,
              normalizeTextItems(block.categories),
            ),
            plannedContent: block.plannedContent?.trim() || undefined,
            plannedObjectives: normalizeTextItems(block.plannedObjectives),
            estimatedMinutes,
            cefrLevels: Array.from(new Set(block.cefrLevels ?? [])),
            skills: normalizeTextItems(block.skills),
            tags: normalizeTextItems(block.tags),
            resources: block.resources ?? [],
            order: blockIndex,
          };
        }),
      })),
      submodules: (module.submodules ?? []).map((submodule) => ({
        title: (submodule.title ?? "").trim(),
        type: submodule.type,
        durationLabel: submodule.durationLabel,
      })),
    })),
    units: curriculum?.units ?? [],
  };
}

function getCurriculumEditorValidationMessage(
  curriculum: CourseTemplateFormValues["curriculum"],
  editableModules: EditableModuleData[],
) {
  const formModules = curriculum?.modules ?? [];

  for (const [moduleIndex, module] of formModules.entries()) {
    if (!(module.title ?? "").trim()) {
      return `El módulo ${moduleIndex + 1} necesita título.`;
    }

    const lessons = editableModules[moduleIndex]?.lessons ?? [];
    for (const [lessonIndex, lesson] of lessons.entries()) {
      if (!lesson.title.trim()) {
        return `La clase modelo ${lessonIndex + 1} del módulo ${moduleIndex + 1} necesita título.`;
      }

      for (const [blockIndex, block] of lesson.blocks.entries()) {
        if (!block.title.trim()) {
          return `El bloque modelo ${blockIndex + 1} de la clase modelo “${lesson.title}” necesita título.`;
        }

        if (
          block.estimatedMinutes !== undefined &&
          block.estimatedMinutes < 0
        ) {
          return `El bloque modelo ${blockIndex + 1} de la clase modelo “${lesson.title}” tiene una duración no válida.`;
        }
      }
    }
  }

  return null;
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

    operationalDefaults: {
      lessonDefaults: {
        durationMinutes:
          values.operationalDefaults?.lessonDefaults?.durationMinutes ?? 60,
        timezone:
          values.operationalDefaults?.lessonDefaults?.timezone?.trim() ||
          "Europe/Madrid",
        defaultClassType:
          values.operationalDefaults?.lessonDefaults?.defaultClassType ??
          "private",
      },
      schedulingDefaults: {
        frequency:
          values.operationalDefaults?.schedulingDefaults?.frequency ??
          "weekly",
        sessionsPerWeek:
          values.operationalDefaults?.schedulingDefaults?.sessionsPerWeek ?? 1,
        preferredWeekdays: Array.from(
          new Set(
            values.operationalDefaults?.schedulingDefaults
              ?.preferredWeekdays ?? [],
          ),
        ).sort((first, second) => first - second),
        allowRecurringLessons:
          values.operationalDefaults?.schedulingDefaults
            ?.allowRecurringLessons ?? true,
      },
      creditPolicy: {
        creditsPerLesson:
          values.operationalDefaults?.creditPolicy?.creditsPerLesson ?? 1,
        consumeOn:
          values.operationalDefaults?.creditPolicy?.consumeOn ?? "completion",
        trialConsumesCredit:
          values.operationalDefaults?.creditPolicy?.trialConsumesCredit ??
          false,
        cancellationConsumesCredit:
          values.operationalDefaults?.creditPolicy
            ?.cancellationConsumesCredit ?? false,
        noShowConsumesCredit:
          values.operationalDefaults?.creditPolicy?.noShowConsumesCredit ??
          true,
      },
      participantPolicy: {
        participantMode:
          values.operationalDefaults?.participantPolicy?.participantMode ??
          "solo",
        minStudents:
          values.operationalDefaults?.participantPolicy?.minStudents ?? 1,
        maxStudents:
          values.operationalDefaults?.participantPolicy?.maxStudents ?? 1,
      },
      preparationPolicy: {
        copyTemplateBlocksToLesson:
          values.operationalDefaults?.preparationPolicy
            ?.copyTemplateBlocksToLesson ?? true,
        copyTemplateResourcesToLesson:
          values.operationalDefaults?.preparationPolicy
            ?.copyTemplateResourcesToLesson ?? true,
        defaultPreparationStatus:
          values.operationalDefaults?.preparationPolicy
            ?.defaultPreparationStatus ?? "needs_preparation",
      },
    },

    curriculum: normalizeCourseTemplateCurriculumForSubmit(values.curriculum),
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
  className = "",
  collapsible = false,
  hasError = false,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  hasError?: boolean;
}) {
  const header = (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#9e2727]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
    </div>
  );

  if (collapsible) {
    return (
      <details
        open={hasError ? true : undefined}
        className={`group overflow-hidden rounded-xl border bg-white shadow-sm ${
          hasError ? "border-red-300" : "border-gray-200"
        } ${className}`}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50/60 px-5 py-4">
          {header}
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-gray-200 p-5">{children}</div>
      </details>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-gray-200 bg-gray-50/60 px-5 py-4">
        {header}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ModuleFields({
  moduleIndex,
  control,
  register,
  setValue,
  errors,
  removeModule,
  editableModules,
  onEditableModulesChange,
  resourceMap,
  isResourcesLoading,
  resourcesError,
  templateId,
  locale,
  canImportFromLesson,
  onImported,
}: {
  moduleIndex: number;
  control: Control<CourseTemplateFormValues>;
  register: UseFormRegister<CourseTemplateFormValues>;
  setValue: UseFormSetValue<CourseTemplateFormValues>;
  errors: FieldErrors<CourseTemplateFormValues>;
  removeModule: (index: number) => void;
  editableModules: EditableModuleData[];
  onEditableModulesChange: (nextModules: EditableModuleData[]) => void;
  resourceMap: ResourceMap;
  isResourcesLoading: boolean;
  resourcesError: string | null;
  templateId?: string;
  locale: string;
  canImportFromLesson: boolean;
  onImported: (result: ImportedLessonResult) => void;
}) {
  const {
    fields: submoduleFields,
    append: appendSubmodule,
    remove: removeSubmodule,
  } = useFieldArray({
    control,
    name: `curriculum.modules.${moduleIndex}.submodules`,
  });
  const moduleValues = useWatch({
    control,
    name: `curriculum.modules.${moduleIndex}`,
  });
  const moduleObjectives = moduleValues?.objectives ?? [];
  const modelLessons = editableModules[moduleIndex]?.lessons ?? [];
  const modelBlocksCount = modelLessons.reduce(
    (total, lesson) => total + (lesson.blocks?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h4 className="font-medium text-gray-900">
            Módulo {moduleIndex + 1}
          </h4>
          <p className="mt-0.5 text-xs text-gray-500">
            {modelLessons.length}{" "}
            {modelLessons.length === 1 ? "clase modelo" : "clases modelo"} ·{" "}
            {modelBlocksCount}{" "}
            {modelBlocksCount === 1 ? "bloque modelo" : "bloques modelo"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => removeModule(moduleIndex)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
        >
          <Trash2 size={16} />
          Eliminar módulo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Título del módulo
          </label>
          <input
            {...register(`curriculum.modules.${moduleIndex}.title`)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="Por ejemplo: Hablar de experiencias"
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
            Duración
          </label>
          <input
            {...register(`curriculum.modules.${moduleIndex}.durationLabel`)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="4 semanas / 8 horas"
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
            Tipo o enfoque
          </label>
          <input
            {...register(`curriculum.modules.${moduleIndex}.type`)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="Conversación / Gramática / Preparación DELE"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Descripción
        </label>
        <textarea
          {...register(`curriculum.modules.${moduleIndex}.description`)}
          rows={3}
          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]"
          placeholder="Resume qué aprenderá la alumna y cómo se trabajará."
        />
        <FieldError
          message={
            errors.curriculum?.modules?.[moduleIndex]?.description?.message as
              | string
              | undefined
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-medium text-gray-800">
              Objetivos del módulo
            </h5>
            <p className="mt-0.5 text-xs text-gray-500">
              Resultados concretos que se esperan al terminarlo.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setValue(
                `curriculum.modules.${moduleIndex}.objectives`,
                [...moduleObjectives, ""],
                { shouldDirty: true, shouldValidate: true },
              )
            }
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-white transition-colors text-sm"
          >
            <Plus size={16} />
            Añadir objetivo
          </button>
        </div>

        {moduleObjectives.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
            Este módulo todavía no tiene objetivos.
          </div>
        ) : null}

        {moduleObjectives.map((_, objectiveIndex) => (
          <div
            key={`module-${moduleIndex}-objective-${objectiveIndex}`}
            className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]"
          >
            <div>
              <input
                {...register(
                  `curriculum.modules.${moduleIndex}.objectives.${objectiveIndex}`,
                )}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                placeholder={`Objetivo ${objectiveIndex + 1}`}
              />
              <FieldError
                message={
                  errors.curriculum?.modules?.[moduleIndex]?.objectives?.[
                    objectiveIndex
                  ]?.message as string | undefined
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setValue(
                  `curriculum.modules.${moduleIndex}.objectives`,
                  moduleObjectives.filter((_, index) => index !== objectiveIndex),
                  { shouldDirty: true, shouldValidate: true },
                )}
              className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
              aria-label={`Eliminar objetivo ${objectiveIndex + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <CourseTemplateLessonsEditor
        modules={editableModules}
        moduleIndex={moduleIndex}
        onChange={onEditableModulesChange}
        resourceMap={resourceMap}
        isResourcesLoading={isResourcesLoading}
        resourcesError={resourcesError}
        templateId={templateId}
        locale={locale}
        canImportFromLesson={canImportFromLesson}
        onImported={onImported}
      />

      <details className="group rounded-lg border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-700">
          Estructura legacy ({submoduleFields.length}{" "}
          {submoduleFields.length === 1 ? "submódulo" : "submódulos"})
          <ChevronDown className="h-4 w-4 text-gray-400 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-gray-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-gray-500">
              Compatibilidad con plantillas antiguas.
            </p>
            <button
              type="button"
              onClick={() => appendSubmodule(getEmptySubmodule())}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Plus size={16} />
              Añadir submódulo
            </button>
          </div>

          {submoduleFields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              No hay submódulos legacy.
            </div>
          ) : null}

          {submoduleFields.map((submodule, subIndex) => (
            <div
              key={submodule.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Título
                </label>
                <input
                  {...register(
                    `curriculum.modules.${moduleIndex}.submodules.${subIndex}.title`,
                  )}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]"
                  placeholder="Título del submódulo"
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <input
                  {...register(
                    `curriculum.modules.${moduleIndex}.submodules.${subIndex}.type`,
                  )}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]"
                  placeholder="Comprensión / Repaso"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Duración
                </label>
                <input
                  {...register(
                    `curriculum.modules.${moduleIndex}.submodules.${subIndex}.durationLabel`,
                  )}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]"
                  placeholder="45 min"
                />
              </div>

              <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeSubmodule(subIndex)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 md:w-auto"
                  aria-label={`Eliminar submódulo ${subIndex + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        </div>
      </details>
    </div>
  );
}

export default function CourseTemplateForm({
  locale,
  initialData,
  submitLabel = "Crear plantilla",
  endpoint = "/api/course-template",
  method = "POST",
  redirectTo,
  cancleHref,
}: CourseTemplateFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo(
    () => getDefaultValues(initialData),
    [initialData],
  );
  const [editableModules, setEditableModules] = useState<EditableModuleData[]>(
    () =>
      createEditableCourseTemplateModules(
        defaultValues.curriculum?.modules ?? [],
      ),
  );
  const [areLessonsDirty, setAreLessonsDirty] = useState(false);
  const allTemplateResourceIds = useMemo(
    () =>
      editableModules.flatMap((module) =>
        module.lessons.flatMap((lesson) =>
          lesson.blocks.flatMap((block) => block.resources ?? []),
        ),
      ),
    [editableModules],
  );
  const {
    resourceMap,
    isLoading: isResourcesLoading,
    error: resourcesError,
  } = useResourcesByIds(allTemplateResourceIds);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty: isFormDirty, isSubmitting },
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
  const hasUnsavedChanges = isFormDirty || areLessonsDirty;
  const detailUrl =
    redirectTo ??
    (initialData
      ? `/${locale}/dashboard/courses/templates/${initialData.id}`
      : `/${locale}/dashboard/courses`);
  const exitUrl = cancleHref ?? detailUrl;
  const isEditMode = method === "PATCH" && Boolean(initialData);
  const shouldSave = !isEditMode || hasUnsavedChanges;

  const leaveEditor = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm("Hay cambios sin guardar. ¿Salir igualmente?")
    ) {
      return;
    }

    router.push(exitUrl);
  };

  const handleImportedLesson = (result: ImportedLessonResult) => {
    const importedValues = getDefaultValues(result.item);

    reset(importedValues);
    setEditableModules(
      createEditableCourseTemplateModules(
        importedValues.curriculum?.modules ?? [],
      ),
    );
    setAreLessonsDirty(false);
    setSubmitError(null);
    toast.success("Clase real importada como clase modelo.");
  };

  const addModule = () => {
    const nextModule = getEmptyModule();
    modulesArray.append(nextModule);
    setEditableModules((currentModules) => [
      ...currentModules,
      createEditableCourseTemplateModule(nextModule),
    ]);
  };

  const removeModule = (moduleIndex: number) => {
    modulesArray.remove(moduleIndex);
    setEditableModules((currentModules) =>
      currentModules.filter((_, index) => index !== moduleIndex),
    );
  };

  const onSubmit = async (rawValues: CourseTemplateFormValues) => {
    setSubmitError(null);

    try {
      const curriculumValidationMessage =
        getCurriculumEditorValidationMessage(
          rawValues.curriculum,
          editableModules,
        );
      if (curriculumValidationMessage) {
        setSubmitError(curriculumValidationMessage);
        return;
      }

      const valuesWithEditedLessons: CourseTemplateFormValues = {
        ...rawValues,
        curriculum: {
          modules: (rawValues.curriculum?.modules ?? []).map(
            (module, moduleIndex) => ({
              ...module,
              lessons: removeLessonClientIds(
                editableModules[moduleIndex]?.lessons ?? [],
              ),
            }),
          ),
          units: rawValues.curriculum?.units ?? [],
        },
      };
      const payload: CourseTemplateSubmitValues =
        createCourseTemplateSchema.parse(
          normalizeBeforeSubmit(valuesWithEditedLessons),
        );

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            data,
            isEditMode
              ? "No se pudo guardar la plantilla."
              : "No se pudo crear la plantilla.",
          ),
        );
      }

      if (method === "PATCH") {
        reset(payload);
        setEditableModules((currentModules) =>
          payload.curriculum.modules.map((module, moduleIndex) => ({
            ...module,
            clientId:
              currentModules[moduleIndex]?.clientId ??
              `module-saved-${moduleIndex}`,
            lessons: module.lessons.map((lesson, lessonIndex) => ({
              ...lesson,
              clientId:
                currentModules[moduleIndex]?.lessons[lessonIndex]?.clientId ??
                `lesson-saved-${moduleIndex}-${lessonIndex}`,
              blocks: lesson.blocks.map((block, blockIndex) => ({
                ...block,
                clientId:
                  currentModules[moduleIndex]?.lessons[lessonIndex]?.blocks[
                    blockIndex
                  ]?.clientId ??
                  `block-saved-${moduleIndex}-${lessonIndex}-${blockIndex}`,
              })),
            })),
          })),
        );
        setAreLessonsDirty(false);
        router.push(detailUrl);
        return;
      }

      const createdTemplateId = getCreatedTemplateId(data);
      if (!createdTemplateId) {
        throw new Error(
          "La plantilla se creó, pero la respuesta no incluye su identificador.",
        );
      }

      router.push(
        redirectTo ??
          `/${locale}/dashboard/courses/templates/${encodeURIComponent(createdTemplateId)}`,
      );
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unexpected error while saving template",
      );
    }
  };

  const onInvalid = () => {
    setSubmitError(
      isEditMode
        ? "Revisa los campos indicados antes de guardar la plantilla."
        : "Revisa los campos obligatorios antes de crear la plantilla.",
    );
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      onChange={() => {
        if (submitError) setSubmitError(null);
      }}
      className="mt-4 flex flex-col gap-6"
    >
      {submitError && (
        <p
          role="alert"
          className="order-none rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </p>
      )}

      <SectionCard
        title="Información básica"
        description="Nombre, código interno y estado de esta guía reutilizable."
        icon={LayoutTemplate}
        className="order-1"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Código interno
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
              Nombre interno
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
              Estado
            </label>
            <select
              {...register("status")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            >
              {COURSETEMPLATE_STATUS.map((status) => (
                <option key={status} value={status}>
                  {getCourseTemplateStatusVisual(status).label}
                </option>
              ))}
            </select>
            <FieldError message={errors.status?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Versión
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
        title="Datos pedagógicos"
        description="Nivel, objetivos y enfoque académico de la plantilla."
        icon={BadgeInfo}
        className="order-2"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nivel
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
              Categoría
            </label>
            <input
              {...register("pedagogicalMeta.category")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Español general / Preparación DELE / Negocios"
            />
            <FieldError message={errors.pedagogicalMeta?.category?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Duración estimada
            </label>
            <input
              {...register("pedagogicalMeta.estimatedDurationLabel")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="12 semanas / 24 sesiones"
            />
            <FieldError
              message={errors.pedagogicalMeta?.estimatedDurationLabel?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Público objetivo
            </label>
            <input
              {...register("pedagogicalMeta.targetAudience")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Adultos / Adolescentes / Profesionales"
            />
            <FieldError
              message={errors.pedagogicalMeta?.targetAudience?.message}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Metodología
          </label>
          <textarea
            {...register("pedagogicalMeta.methodology")}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            placeholder="Describe el enfoque comunicativo, trabajo por tareas, aula invertida, etc."
          />
          <FieldError message={errors.pedagogicalMeta?.methodology?.message} />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-800">Objetivos</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Añade cada resultado de aprendizaje por separado.
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
              Añadir objetivo
            </button>
          </div>

          {objectives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              Todavía no hay objetivos pedagógicos.
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
                  placeholder={`Objetivo ${index + 1}`}
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
        title="Reglas por defecto"
        description="Estas reglas se copiarán cuando crees un curso real desde esta plantilla. Después podrás modificarlas para cada curso."
        icon={Settings2}
        className="order-3"
      >
        <CourseTemplateOperationalDefaultsFields
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      </SectionCard>

      <SectionCard
        title="Publicación comercial avanzada"
        description="Estos campos servirán si esta plantilla se usa también para mostrar cursos en la web pública."
        icon={BookOpen}
        className="order-5"
        collapsible
        hasError={Boolean(errors.storefront)}
      >
        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register("storefront.isPublished")}
              className="rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
            />
            Publicada en la web
          </label>
          <FieldError message={errors.storefront?.isPublished?.message} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Título público
            </label>
            <input
              {...register("storefront.publicTitle")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Aprende español B2 con confianza"
            />
            <FieldError message={errors.storefront?.publicTitle?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Modalidad de precio
            </label>
            <select
              {...register("storefront.priceMode")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
            >
              {STORE_FRONT_PRICE_MODE.map((mode) => (
                <option key={mode} value={mode}>
                  {getCourseTemplatePriceModeLabel(mode)}
                </option>
              ))}
            </select>
            <FieldError message={errors.storefront?.priceMode?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Moneda
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
              Descripción breve
            </label>
            <textarea
              {...register("storefront.shortDescription")}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Resumen para tarjetas y cabeceras de la web."
            />
            <FieldError
              message={errors.storefront?.shortDescription?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción ampliada
            </label>
            <textarea
              {...register("storefront.longDescription")}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Presentación completa y propuesta del programa."
            />
            <FieldError message={errors.storefront?.longDescription?.message} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Título SEO
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
              Descripción SEO
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
              URL del vídeo promocional
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
              Texto del botón
            </label>
            <input
              {...register("storefront.ctaText")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
              placeholder="Reserva ahora / Solicita información"
            />
            <FieldError message={errors.storefront?.ctaText?.message} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL de imagen principal
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
              URL de miniatura
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
              <h3 className="text-sm font-medium text-gray-800">Beneficios</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Puntos destacados que se mostrarán en la página pública.
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
              Añadir beneficio
            </button>
          </div>

          {benefits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              Todavía no hay beneficios públicos.
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
                  placeholder={`Beneficio ${index + 1}`}
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
                Opciones de precio
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Tarifas mensuales, por paquete, gratuitas o personalizadas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => priceOptionsArray.append(getEmptyPriceOption())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <Plus size={16} />
              Añadir opción
            </button>
          </div>

          {priceOptionsArray.fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
              Todavía no hay opciones de precio.
            </div>
          ) : null}

          {priceOptionsArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium text-gray-900">
                  Opción de precio {index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => priceOptionsArray.remove(index)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre
                  </label>
                  <input
                    {...register(`storefront.priceOptions.${index}.label`)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent"
                    placeholder="Bono de 8 clases"
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
                    Importe
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
                    Modalidad
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
                        {getParticipantModeLabel(mode)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nº de participantes
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
                    Clases del paquete
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
                    Clases al mes
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
                    Destacada
                  </label>
                </div>

                <div className="flex items-end gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      {...register(`storefront.priceOptions.${index}.isActive`)}
                      className="rounded border-gray-300 text-[#9e2727] focus:ring-[#9e2727]"
                    />
                    Activa
                  </label>

                  <div className="w-full max-w-[140px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Orden
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
        title="Estructura del curso"
        description="Módulos, clases modelo y estructura legacy de la guía."
        icon={ListTree}
        className="order-4"
      >
        <div className="flex flex-col gap-5">
          <div className="order-2 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-800">
                  Unidades legacy
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Campo de compatibilidad con plantillas antiguas.
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
                Añadir unidad
              </button>
            </div>

            {units.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
                No hay unidades legacy.
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
                    placeholder={`Unidad ${index + 1}`}
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

          <div className="order-1 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-800">Módulos</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Estructura pedagógica principal de la plantilla.
                </p>
              </div>

              <button
                type="button"
                onClick={addModule}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                <Plus size={16} />
                Añadir módulo
              </button>
            </div>

            {modulesArray.fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500">
                Aún no hay módulos. Añade el primero para empezar a organizar el
                recorrido del curso.
              </div>
            ) : null}

            <div className="space-y-4">
              {modulesArray.fields.map((field, moduleIndex) => (
                <ModuleFields
                  key={editableModules[moduleIndex]?.clientId ?? field.id}
                  moduleIndex={moduleIndex}
                  control={control}
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  removeModule={removeModule}
                  editableModules={editableModules}
                  resourceMap={resourceMap}
                  isResourcesLoading={isResourcesLoading}
                  resourcesError={resourcesError}
                  templateId={isEditMode ? initialData?.id : undefined}
                  locale={locale}
                  canImportFromLesson={!hasUnsavedChanges}
                  onImported={handleImportedLesson}
                  onEditableModulesChange={(nextModules) => {
                    setEditableModules(nextModules);
                    setAreLessonsDirty(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="order-6 sticky bottom-4 z-10">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            role="status"
            className={`text-sm font-medium ${
              shouldSave ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {isEditMode
              ? hasUnsavedChanges
                ? "Cambios sin guardar"
                : "Guardado"
              : "Pendiente de crear"}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={leaveEditor}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              {isEditMode ? "Volver al detalle" : "Cancelar"}
            </button>

            <button
              type={shouldSave ? "submit" : "button"}
              onClick={
                shouldSave ? undefined : () => router.push(detailUrl)
              }
              disabled={isSubmitting}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9e2727] text-white hover:bg-[#8d2121] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSubmitting
                ? isEditMode
                  ? "Guardando..."
                  : "Creando..."
                : shouldSave
                  ? submitLabel
                  : "Volver al detalle"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
