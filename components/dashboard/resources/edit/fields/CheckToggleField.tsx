import { cn } from "@/lib/utils/form-helpers";
import { Check } from "lucide-react";
import { EditFormValues } from "@/lib/utils/resource-mappers";
import { UseFormSetValue } from "react-hook-form";

interface CheckToggleField {
  resource: Partial<EditFormValues>;
  setValue: UseFormSetValue<EditFormValues>;
}

function CheckToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition",
        checked
          ? "border-[#9e2727]/30 bg-[#9e2727]/5"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-[#9e2727] bg-[#9e2727] text-white"
            : "border-slate-300 bg-white",
        )}
      >
        {checked && <Check size={10} strokeWidth={3} />}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
    </button>
  );
}

export default function CheckToggleField({
  resource,
  setValue,
}: CheckToggleField) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Opciones adicionales
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CheckToggle
          label="Incluye solución"
          description="El recurso tiene answer key adjunto."
          checked={resource.hasAnswerKey ?? false}
          onChange={(v) => setValue("hasAnswerKey", v, { shouldDirty: true })}
        />
        <CheckToggle
          label="Requiere revisión"
          description="La profesora debe revisar antes de publicar."
          checked={resource.requiresTeacherReview ?? false}
          onChange={(v) =>
            setValue("requiresTeacherReview", v, { shouldDirty: true })
          }
        />
      </div>
    </div>
  );
}
