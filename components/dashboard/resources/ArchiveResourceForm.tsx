import { ResourceStatus } from "@/lib/constants/resource.constants";

export interface ArchiveResourceFormData {
  status: ResourceStatus;
}

interface ArchiveResourceFormProps {
  resource: string | null;
  resourceName: string | null;
  onSubmitForm: (
    resourceId: string | null,
    data: ArchiveResourceFormData,
  ) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export default function ArchiveResourceForm({
  resource,
  resourceName,
  onSubmitForm,
  isSubmitting,
  onClose,
}: ArchiveResourceFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStatus: ArchiveResourceFormData = { status: "archived" };
    onSubmitForm(resource, newStatus);
  };
  return (
    <div>
      <p className="text-white font-sm flex items-center">
        ¿Está seguro de que desea archivar el recurso: {resourceName}?
      </p>
      <div className="text-sm font-light flex flex-col text-justify gap-2 mt-2 text-gray-300">
        <p>
          Esta acción es reversible desde la página de detalles de este recurso.
        </p>
        <p>
          Todo archivo con un periodo mayor a 30 días se borrarán
          definitivamente de la base de datos.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="w-full flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            data-autofocus
            onClick={() => onClose()}
            className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm text-white inset-ring inset-ring-white/5 hover:bg-white/20 sm:mt-0 sm:w-auto"
          >
            Cancelar
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
            {isSubmitting ? "Procesando..." : "Archivar"}
          </button>
        </div>
      </form>
    </div>
  );
}
