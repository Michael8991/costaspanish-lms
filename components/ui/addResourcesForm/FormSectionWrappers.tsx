import { FormatType } from "@/lib/constants/resource.constants";
import { cn } from "@/lib/utils/form-helpers";

type Step = 1 | 2 | 3 | 4;

export function SectionHeader({
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

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-2 text-sm text-red-600">{error}</p>;
}

export function FormField({
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

export function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
    hasError
      ? "border-red-300 ring-2 ring-red-100"
      : "border-slate-200 focus:border-slate-400",
  );
}

export function getStepFields(step: Step, format?: FormatType) {
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
