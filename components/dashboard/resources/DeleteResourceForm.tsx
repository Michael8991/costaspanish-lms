import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteResourceFormProps {
  resource: string | null;
  resourceName: string | null;
  onSubmitForm: (resourceId: string | null) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export default function DeleteResourceForm({
  resource,
  resourceName,
  onSubmitForm,
  isSubmitting,
  onClose,
}: DeleteResourceFormProps) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100">
          <Trash2 size={14} className="text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-slate-400">
            Recurso a eliminar
          </p>
          <p className="truncate text-sm font-medium text-slate-800">
            {resourceName ?? "Sin nombre"}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
        <div>
          <p className="text-sm font-medium text-red-700">
            Esta acción es permanente e irreversible
          </p>
          <p className="mt-0.5 text-xs text-red-500/80">
            El archivo será eliminados definitivamente de la base de datos pero,
            la información básica del material seguirá visible en las clases
            donde ya lo habías añadido
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-200">
        ¿Estás seguro de que quieres eliminar? No podrás recuperarlo después.
      </p>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSubmitForm(resource)}
          disabled={isSubmitting}
          className={`cursor-pointer flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-all ${
            isSubmitting
              ? "cursor-not-allowed bg-red-300"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          <Trash2 size={14} />
          {isSubmitting ? "Eliminando..." : "Eliminar definitivamente"}
        </button>
      </div>
    </div>
  );
}
