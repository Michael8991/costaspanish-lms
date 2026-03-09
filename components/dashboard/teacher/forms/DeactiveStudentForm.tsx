import { AlertCircle } from "lucide-react";

export interface DeactiveStudentFormData {
  isActive: boolean;
}

interface DeactiveStudentProps {
  onSubmitForm: (data: DeactiveStudentFormData) => void;
  isSubmitting: boolean;
  student: string;
  onClose: () => void;
}
export default function DeactiveStudentForm({
  student,
  isSubmitting,
  onSubmitForm,
  onClose,
}: DeactiveStudentProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStatus: DeactiveStudentFormData = { isActive: false };
    onSubmitForm(newStatus);
  };
  return (
    <div>
      <p className="text-white font-md flex items-center">
        ¿Estás seguro de que deseas cambiar el estado de {student}?
      </p>
      <p className="text-white text-xs font-light flex gap-2 mt-2">
        <AlertCircle size={14} /> Esta acción es reversible desde el panel del
        estudiante.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="w-full flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            data-autofocus
            onClick={() => onClose()}
            className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm text-white inset-ring inset-ring-white/5 hover:bg-white/20 sm:mt-0 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm text-white sm:ml-3 sm:w-auto transition-colors ${
              isSubmitting
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-400 cursor-pointer"
            }`}
          >
            {/* Pequeño extra visual: Si está cargando, cambiamos el texto */}
            {isSubmitting ? "Processing..." : "Deactivate"}
          </button>
        </div>
      </form>
    </div>
  );
}
