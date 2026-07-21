"use client";

import { FormEvent, useState } from "react";

type BugReportCategory =
  | "error"
  | "critical_error"
  | "improvement"
  | "suggestion";

interface BugReportFormProps {
  onClose: () => void;
}

export default function BugReportForm({ onClose }: BugReportFormProps) {
  const [category, setCategory] = useState<BugReportCategory | "">("");

  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!category || !title.trim()) {
      setError("Selecciona una categoría y escribe un título.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/github/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          url: window.location.href,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "No se pudo enviar el informe.");
      }

      setCategory("");
      setTitle("");
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo enviar el informe.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
      <div className="space-y-1.5">
        <label
          htmlFor="bug-category"
          className="block text-sm font-medium text-gray-100"
        >
          Categoría
        </label>

        <select
          id="bug-category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as BugReportCategory | "")
          }
          className={`w-full rounded-lg border border-gray-500 bg-gray-800 px-3 py-2.5 outline-none ${
            category ? "text-white" : "text-gray-400"
          }`}
        >
          <option value="" disabled className="bg-gray-800 text-gray-400">
            Selecciona una categoría
          </option>

          <option value="error" className="bg-gray-800 text-white">
            Error
          </option>

          <option value="critical_error" className="bg-gray-800 text-white">
            Error grave
          </option>

          <option value="improvement" className="bg-gray-800 text-white">
            Posible mejora
          </option>

          <option value="suggestion" className="bg-gray-800 text-white">
            Sugerencia
          </option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="bug-title"
          className="block text-sm font-medium text-gray-100"
        >
          Título
        </label>

        <input
          id="bug-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Describe brevemente el problema"
          maxLength={150}
          className="w-full rounded-lg border border-gray-500 bg-gray-800 px-3 py-2.5 text-white outline-none placeholder:text-gray-400"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-500 px-4 py-2.5 font-medium text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !category || !title.trim()}
          className="rounded-lg bg-black px-4 py-2.5 font-medium text-white transition hover:bg-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Enviando..." : "Enviar informe"}
        </button>
      </div>
    </form>
  );
}
