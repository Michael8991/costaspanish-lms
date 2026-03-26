import { cn, toDisplayLabel } from "@/lib/utils/form-helpers";
import { Field } from "./Field";
import {
  RESOURCE_STATUS,
  RESOURCE_VISIBILITY,
} from "@/lib/constants/resource.constants";
import { ResourceDetailDTO } from "@/lib/dto/resource.dto";
import { Loader2, Save } from "lucide-react";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { EditFormValues } from "./FormSection";
import { useRouter } from "next/navigation";

interface SidebarInfoProps {
  resource: ResourceDetailDTO;
  register: UseFormRegister<EditFormValues>;
  errors: FieldErrors<EditFormValues>;
  isSubmitting: boolean;
  isDirty: boolean;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-40 truncate text-right font-medium text-slate-700">
        {value}
      </span>
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

export default function SidebarInfo({
  errors,
  resource,
  isSubmitting,
  register,
  isDirty,
}: SidebarInfoProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-6 flex flex-col gap-4">
        {/* Estado y visibilidad */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Publicación
            </h2>
          </div>
          <Field label="Estado" error={errors.status?.message}>
            <select {...register("status")} className={inputClass()}>
              {RESOURCE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {toDisplayLabel(s)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Visibilidad" error={errors.visibility?.message}>
            <select {...register("visibility")} className={inputClass()}>
              {RESOURCE_VISIBILITY.map((v) => (
                <option key={v} value={v}>
                  {toDisplayLabel(v)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Info del archivo — solo lectura */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Archivo
          </p>
          <div className="flex flex-col gap-2">
            <MetaItem
              label="Formato"
              value={toDisplayLabel(resource.asset.format)}
            />
            {resource.asset.originalFilename && (
              <MetaItem
                label="Nombre"
                value={resource.asset.originalFilename}
              />
            )}
            {resource.asset.mimeType && (
              <MetaItem label="MIME" value={resource.asset.mimeType} />
            )}
            {resource.asset.pageCount && (
              <MetaItem
                label="Páginas"
                value={String(resource.asset.pageCount)}
              />
            )}
            {resource.asset.durationSeconds && (
              <MetaItem
                label="Duración"
                value={`${resource.asset.durationSeconds}s`}
              />
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            El archivo no se puede cambiar desde aquí.
          </p>
        </div>

        {/* Botones */}
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition",
            isDirty && !isSubmitting
              ? "cursor-pointer bg-[#9e2727] hover:bg-[#8a2222]"
              : "cursor-not-allowed bg-slate-300",
          )}
        >
          {isSubmitting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
