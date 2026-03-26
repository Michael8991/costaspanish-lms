import { cn, toDisplayLabel } from "@/lib/utils/form-helpers";
import { Field } from "./Field";
import {
  CEFR_LEVELS,
  DELIVERY_MODES,
  LESSON_STAGES,
  PEDAGOGICAL_TYPES,
  SKILL_FOCUS,
} from "@/lib/constants/resource.constants";
import { EditFormValues } from "./FormSection";
import { FieldErrors, UseFormRegister } from "react-hook-form";

interface ToggleGroupFieldProps {
  resource: Partial<EditFormValues>;
  onToggle: (field: keyof EditFormValues, value: string) => void;
  register: UseFormRegister<EditFormValues>;
  errors: FieldErrors<EditFormValues>;
}

function ToggleGroup<T extends string>({
  options,
  values,
  onToggle,
}: {
  options: readonly T[];
  values: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              selected
                ? "border-[#9e2727] bg-[#9e2727]/8 text-[#9e2727]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {toDisplayLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

const inputClass = (hasError = false) =>
  cn(
    "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
    hasError
      ? "border-red-300 ring-2 ring-red-100"
      : "border-slate-200 focus:border-slate-400",
  );

export default function ToggleGroupField({
  resource,
  onToggle,
  register,
  errors,
}: ToggleGroupFieldProps) {
  return (
    <>
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-700">Identidad</h2>
        </div>

        <Field label="Título" required error={errors.title?.message}>
          <input
            type="text"
            {...register("title")}
            className={inputClass(Boolean(errors.title))}
            placeholder="Past Simple - Reading Worksheet"
          />
        </Field>

        <Field label="Descripción" error={errors.description?.message}>
          <textarea
            rows={4}
            {...register("description")}
            className={inputClass(Boolean(errors.description))}
            placeholder="Contexto, instrucciones o notas..."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Tipo pedagógico"
            required
            error={errors.pedagogicalType?.message}
          >
            <select
              {...register("pedagogicalType")}
              className={inputClass(Boolean(errors.pedagogicalType))}
            >
              {PEDAGOGICAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {toDisplayLabel(t)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Duración (min)"
            error={errors.estimatedDurationMinutes?.message}
          >
            <input
              type="number"
              min={1}
              max={180}
              placeholder="20"
              {...register("estimatedDurationMinutes", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              className={inputClass(Boolean(errors.estimatedDurationMinutes))}
            />
          </Field>

          <Field label="Dificultad (1-5)" error={errors.difficulty?.message}>
            <input
              type="number"
              min={1}
              max={5}
              placeholder="3"
              {...register("difficulty", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              className={inputClass(Boolean(errors.difficulty))}
            />
          </Field>
        </div>
      </div>
      {/* Clasificación */}
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Clasificación pedagógica
          </h2>
        </div>

        <Field label="Niveles CEFR">
          <ToggleGroup
            options={CEFR_LEVELS}
            values={resource.levels ?? []}
            onToggle={(v) => onToggle("levels", v)}
          />
        </Field>

        <Field label="Habilidades">
          <ToggleGroup
            options={SKILL_FOCUS}
            values={resource.skills ?? []}
            onToggle={(v) => onToggle("skills", v)}
          />
        </Field>

        <Field label="Modo de entrega">
          <ToggleGroup
            options={DELIVERY_MODES}
            values={resource.deliveryModes ?? []}
            onToggle={(v) => onToggle("deliveryModes", v)}
          />
        </Field>

        <Field label="Etapa de la clase">
          <ToggleGroup
            options={LESSON_STAGES}
            values={resource.lessonStages ?? []}
            onToggle={(v) => onToggle("lessonStages", v)}
          />
        </Field>
      </div>
      {/* Temas y tags */}
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Temas y etiquetas
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Grammar topics" hint="Separados por comas">
            <input
              type="text"
              placeholder="past simple, irregular verbs"
              {...register("grammarTopicsInput")}
              className={inputClass()}
            />
          </Field>

          <Field label="Vocabulary topics" hint="Separados por comas">
            <input
              type="text"
              placeholder="travel, holidays"
              {...register("vocabularyTopicsInput")}
              className={inputClass()}
            />
          </Field>

          <Field label="Tags" hint="Separados por comas">
            <input
              type="text"
              placeholder="b1, worksheet, exam prep"
              {...register("tagsInput")}
              className={inputClass()}
            />
          </Field>
        </div>
      </div>
    </>
  );
}
