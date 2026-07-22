"use client";

import {
  type DBClassType,
  type DBPlanBillingType,
  type DBPlanStatus,
} from "@/lib/types/student";
import { CircleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";

const classTypes: DBClassType[] = [
  "private",
  "pair",
  "group_regular",
  "semi_intensive",
  "intensive",
];
const billingTypes: DBPlanBillingType[] = [
  "single",
  "package",
  "subscription",
];
const classTypeLabels: Record<DBClassType, string> = {
  private: "Clase privada",
  pair: "Clase de pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensivo",
  intensive: "Intensivo",
};

export interface NewVoucherFormData {
  name: string;
  billingType: DBPlanBillingType | "";
  classType: DBClassType | "";
  creditsTotal: number;
  creditsRemaining: number;
  validFrom: string;
  validUntil: string;
  status: DBPlanStatus;
  price: number;
}

interface NewVoucherProps {
  onSubmitForm: (data: NewVoucherFormData) => void;
  isSubmitting: boolean;
  student: string;
  onClose: () => void;
  activeVouchersCount?: number;
  variant?: "full" | "quick";
  initialClassType?: DBClassType;
  submitError?: string;
}

export default function NewVoucherForm({
  onSubmitForm,
  isSubmitting,
  student,
  onClose,
  activeVouchersCount = 0,
  variant = "full",
  initialClassType,
  submitError,
}: NewVoucherProps) {
  const isQuick = variant === "quick";
  const [formData, setFormData] = useState<NewVoucherFormData>({
    name: "",
    billingType: isQuick ? "package" : "",
    classType: initialClassType ?? "",
    creditsTotal: 0,
    creditsRemaining: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: "",
    status: "active",
    price: 0,
  });
  const [formError, setFormError] = useState("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const nextData = { ...currentData, [name]: value };

      if (name === "price") nextData.price = Number(value);
      if (name === "creditsTotal") {
        nextData.creditsTotal = Number(value);
        nextData.creditsRemaining = Number(value);
      }
      if (name === "creditsRemaining") {
        nextData.creditsRemaining = Number(value);
      }

      return nextData;
    });
    setFormError("");
  };

  const submitVoucher = () => {
    const submissionData: NewVoucherFormData = isQuick
      ? {
          ...formData,
          name: `Bono ${formData.creditsTotal} clases`,
          billingType: "package",
          classType: initialClassType ?? "",
          creditsRemaining: formData.creditsTotal,
          status: "active",
          price: 0,
        }
      : formData;

    if (!submissionData.name.trim()) {
      return setFormError("Introduce un nombre para el bono.");
    }
    if (!submissionData.billingType) {
      return setFormError("Selecciona un tipo de bono.");
    }
    if (!submissionData.classType) {
      return setFormError("Selecciona un modelo de clase.");
    }
    if (submissionData.creditsTotal <= 0) {
      return setFormError("Los créditos deben ser mayores a 0.");
    }
    if (!submissionData.validUntil) {
      return setFormError("Selecciona una fecha de caducidad.");
    }
    if (
      new Date(submissionData.validUntil) <
      new Date(submissionData.validFrom)
    ) {
      return setFormError(
        "La fecha de caducidad no puede ser anterior a la de inicio.",
      );
    }
    if (submissionData.price < 0) {
      return setFormError("El precio no puede ser menor a 0.");
    }

    onSubmitForm(submissionData);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitVoucher();
  };
  const inputClass =
    "w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white transition-all placeholder:text-white/30 focus:border-white/50 focus:bg-white/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70";
  const labelClass =
    "mb-1 text-xs font-medium uppercase tracking-wide text-white/70";

  const fields = (
    <>
      {activeVouchersCount > 0 && !isQuick && (
        <p className="mb-1 flex w-full items-center gap-2 text-sm text-white/80">
          <CircleAlert size={14} className="text-red-400" />
          {student} tiene {activeVouchersCount}{" "}
          {activeVouchersCount === 1 ? "bono activo" : "bonos activos"}
        </p>
      )}

      {isQuick && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
          Nuevo bono para <span className="font-medium text-white">{student}</span>
        </div>
      )}

      {(formError || submitError) && (
        <div className="rounded-md border border-red-500/50 bg-red-500/20 px-3 py-2 text-sm text-red-200">
          {formError || submitError}
        </div>
      )}

      {!isQuick && (
        <div className="flex flex-col">
          <label htmlFor="name" className={labelClass}>
            Nombre del bono
          </label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="Por ejemplo: Bono 10 clases"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!isQuick && (
          <div className="flex min-w-[140px] flex-1 flex-col">
            <label htmlFor="billingType" className={labelClass}>
              Tipo de bono
            </label>
            <select
              id="billingType"
              name="billingType"
              value={formData.billingType}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="" disabled className="bg-gray-800">
                Seleccione un tipo
              </option>
              {billingTypes.map((billingType) => (
                <option
                  key={billingType}
                  value={billingType}
                  className="bg-gray-800"
                >
                  {billingType}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex min-w-[140px] flex-1 flex-col">
          <label htmlFor="classType" className={labelClass}>
            Modelo de clase
          </label>
          {isQuick ? (
            <input
              id="classType"
              value={
                initialClassType ? classTypeLabels[initialClassType] : ""
              }
              readOnly
              className={inputClass}
            />
          ) : (
            <select
              id="classType"
              name="classType"
              value={formData.classType}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="" disabled className="bg-gray-800">
                Seleccione un modelo
              </option>
              {classTypes.map((classType) => (
                <option
                  key={classType}
                  value={classType}
                  className="bg-gray-800"
                >
                  {classType}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!isQuick && (
          <div className="flex min-w-[140px] flex-1 flex-col">
            <label htmlFor="validFrom" className={labelClass}>
              Fecha de inicio
            </label>
            <input
              id="validFrom"
              name="validFrom"
              type="date"
              value={formData.validFrom}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        )}

        <div className="flex min-w-[140px] flex-1 flex-col">
          <label htmlFor="validUntil" className={labelClass}>
            Fecha de caducidad
          </label>
          <input
            id="validUntil"
            name="validUntil"
            type="date"
            value={formData.validUntil}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[140px] flex-1 flex-col">
          <label htmlFor="creditsTotal" className={labelClass}>
            Créditos totales
          </label>
          <input
            id="creditsTotal"
            name="creditsTotal"
            type="number"
            min={1}
            value={formData.creditsTotal || ""}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="Ej: 10"
          />
        </div>

        {!isQuick && (
          <>
            <div className="flex min-w-[140px] flex-1 flex-col">
              <label htmlFor="creditsRemaining" className={labelClass}>
                Créditos restantes
              </label>
              <input
                id="creditsRemaining"
                name="creditsRemaining"
                type="number"
                min={0}
                value={formData.creditsRemaining || ""}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Ej: 10"
              />
            </div>
            <div className="flex min-w-[140px] flex-1 flex-col">
              <label htmlFor="price" className={labelClass}>
                Precio del bono
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                value={formData.price || ""}
                onChange={handleChange}
                step="0.01"
                required
                className={inputClass}
                placeholder="Ej: 190"
              />
            </div>
          </>
        )}
      </div>

      <div className="h-px w-full bg-white/10" />
      <div className="flex w-full items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          Cancelar
        </button>
        <button
          type={isQuick ? "button" : "submit"}
          onClick={isQuick ? submitVoucher : undefined}
          disabled={isSubmitting}
          className={`rounded-md px-4 py-2 text-sm text-white transition-colors ${
            isSubmitting
              ? "cursor-not-allowed bg-red-400"
              : "cursor-pointer bg-red-500 hover:bg-red-400"
          }`}
        >
          {isSubmitting ? "Creando..." : "Crear bono"}
        </button>
      </div>
    </>
  );

  if (isQuick) {
    return <div className="flex w-full flex-col gap-4 p-2">{fields}</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex w-full flex-col gap-4 text-sm font-light"
    >
      {fields}
    </form>
  );
}
