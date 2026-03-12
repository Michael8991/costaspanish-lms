import { DBPlanStatus } from "@/lib/types/student";
import { AlertCircle } from "lucide-react";
import { FormattedPlan } from "../students/ActiveVouchersPanel";

export interface RemoveVoucherFormData {
  status: DBPlanStatus;
}

interface RemoveVoucherFormProps {
  student: string;
  plan: FormattedPlan;
  onSubmitForm: (planId: string, data: RemoveVoucherFormData) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export default function EditVoucherForm({
  student,
  plan,
  onSubmitForm,
  isSubmitting,
  onClose,
}: RemoveVoucherFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStatus: RemoveVoucherFormData = { status: "canceled" };
    onSubmitForm(plan.id, newStatus);
  };
  return (
    <div>
      <p className="text-white font-sm flex items-center">
        ¿Estás seguro de que deseas cambiar el estado del bono {plan.name} del
        estudiante {student}?
      </p>
      <p className="text-xs font-light flex gap-2 mt-2 text-gray-300">
        <AlertCircle size={14} /> Esta acción es reversible desde el historial
        de bonos.
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
            {isSubmitting ? "Processing..." : "Remove"}
          </button>
        </div>
      </form>
    </div>
  );
}
