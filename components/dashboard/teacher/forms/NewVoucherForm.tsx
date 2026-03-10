"use client";

import {
  DBClassType,
  DBPlanBillingType,
  DBPlanStatus,
} from "@/lib/types/student";
import { CircleAlert } from "lucide-react";
import { useState } from "react";

const ClassTypes = [
  "private",
  "pair",
  "group_regular",
  "semi_intensive",
  "intensive",
];

const BillingTypes = ["single", "package", "subscription"];

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
}

export default function NewVoucherForm({
  onSubmitForm,
  isSubmitting,
  student,
  onClose,
  activeVouchersCount = 0,
}: NewVoucherProps) {
  const [formData, setFormData] = useState<NewVoucherFormData>({
    name: "",
    billingType: "",
    classType: "",
    creditsTotal: 0,
    creditsRemaining: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: "",
    status: "active",
    price: 0,
  });

  const [formError, setFormError] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === "price") {
        newData.price = Number(value);
      }

      if (name === "creditsTotal") {
        newData.creditsTotal = Number(value);
        newData.creditsRemaining = Number(value);
      }

      if (name === "creditsRemaining") {
        newData.creditsRemaining = Number(value);
      }

      return newData;
    });

    setFormError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.billingType)
      return setFormError("Selecciona un tipo de bono.");
    if (!formData.classType)
      return setFormError("Selecciona un modelo de clase.");
    if (formData.creditsTotal <= 0)
      return setFormError("Los créditos deben ser mayores a 0.");
    if (new Date(formData.validUntil) < new Date(formData.validFrom)) {
      return setFormError(
        "La fecha de caducidad no puede ser anterior a la de inicio.",
      );
    }
    if (formData.price < 0)
      return setFormError("El precio no puede ser menor a 0");

    onSubmitForm(formData);
  };

  const inputClass =
    "border border-white/20 rounded-lg py-2 px-4 text-white bg-white/10 w-full placeholder:text-white/30 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all";
  const labelClass =
    "mb-1 text-white/70 text-xs uppercase tracking-wide font-medium";

  return (
    <div className="flex flex-col w-full">
      {activeVouchersCount > 0 && (
        <p className="text-white/80 font-md flex items-center w-full text-center gap-2 text-sm mb-1">
          <CircleAlert size={14} className="text-red-400" />
          {student} tiene {activeVouchersCount}{" "}
          {activeVouchersCount === 1 ? "bono activo" : "bonos activos"}
        </p>
      )}

      {formError && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm px-3 py-2 rounded-md mt-2">
          {formError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col justify-center font-light text-sm mt-3 gap-4"
      >
        <div className="flex flex-col w-full">
          <label htmlFor="name" className={labelClass}>
            Nombre del Bono
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

        <div className="flex flex-wrap w-full gap-3">
          <div className="flex flex-col flex-1 min-w-[140px]">
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
              {BillingTypes.map((type) => (
                <option key={type} value={type} className="bg-gray-800">
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col flex-1 min-w-[140px]">
            <label htmlFor="classType" className={labelClass}>
              Modelo de clase
            </label>
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
              {ClassTypes.map((type) => (
                <option key={type} value={type} className="bg-gray-800">
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap w-full gap-3">
          <div className="flex flex-col flex-1 min-w-[140px]">
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

          <div className="flex flex-col flex-1 min-w-[140px]">
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

        <div className="flex flex-wrap w-full gap-3">
          <div className="flex flex-col flex-1 min-w-[140px]">
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

          <div className="flex flex-col flex-1 min-w-[140px]">
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
          <div className="flex flex-col flex-1 min-w-[140px]">
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
        </div>

        <div className="w-full h-px bg-white/10 my-1" />

        {/* Btns */}
        <div className="w-full flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer inline-flex justify-center rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex justify-center rounded-md px-4 py-2 text-sm text-white transition-colors ${
              isSubmitting
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-400 cursor-pointer"
            }`}
          >
            {isSubmitting ? "Procesando..." : "Crear bono"}
          </button>
        </div>
      </form>
    </div>
  );
}
