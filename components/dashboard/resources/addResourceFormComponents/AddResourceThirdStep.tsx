import {
  FormField,
  inputClass,
  SectionHeader,
  SelectionGroup,
} from "@/components/ui/addResourcesForm/FormSectionWrappers";
import {
  CEFR_LEVELS,
  CEFRLevel,
  DELIVERY_MODES,
  DeliveryModes,
  LESSON_STAGES,
  LessonStage,
  PEDAGOGICAL_TYPES,
  SKILL_FOCUS,
  SkillFocus,
} from "@/lib/constants/resource.constants";
import { cn, toDisplayLabel, toggleArrayValue } from "@/lib/utils/form-helpers";
import { createResourceSchema } from "@/lib/validators/resource";
import { Check } from "lucide-react";
import { useFormContext } from "react-hook-form";
import z from "zod";

export default function AddResourceThirdStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<z.input<typeof createResourceSchema>>();

  const values = watch();

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

  return (
    <div>
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
            onToggle={(value) => handleMultiToggle("deliveryModes", value)}
          />

          <SelectionGroup
            title="Etapa de la clase"
            options={LESSON_STAGES}
            values={values.lessonStages || []}
            onToggle={(value) => handleMultiToggle("lessonStages", value)}
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
              className={inputClass(Boolean(errors.estimatedDurationMinutes))}
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
            error={errors.grammarTopics?.message}
          >
            <input
              type="text"
              placeholder="past simple, irregular verbs"
              {...register("grammarTopics")}
              className={inputClass(Boolean(errors.grammarTopics))}
            />
          </FormField>

          <FormField
            label="Vocabulary topics"
            hint="Separados por comas."
            error={errors.vocabularyTopics?.message}
          >
            <input
              type="text"
              placeholder="travel, holidays, transport"
              {...register("vocabularyTopics")}
              className={inputClass(Boolean(errors.vocabularyTopics))}
            />
          </FormField>

          <FormField
            label="Tags"
            hint="Separados por comas."
            error={errors.tags?.message}
          >
            <input
              type="text"
              placeholder="b1, worksheet, exam prep"
              {...register("tags")}
              className={inputClass(Boolean(errors.tags))}
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
