"use client";

import Link from "next/link";
import { CourseTemplateListItemDTO } from "@/lib/dto/course-template.dto";
import {
  AlertCircle,
  ChevronRight,
  Search,
  Plus,
  Info,
  Eye,
  Archive,
} from "lucide-react";

interface CourseTemplateTableProps {
  courseTemplates: CourseTemplateListItemDTO[];
  locale: string;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
}

function getStatusBadge(status: CourseTemplateListItemDTO["status"]) {
  switch (status) {
    case "ready":
      return "bg-green-50 text-green-700 border-green-200";
    case "draft":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "archived":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function getPriceModeLabel(priceMode: CourseTemplateListItemDTO["priceMode"]) {
  switch (priceMode) {
    case "monthly":
      return "Monthly";
    case "package":
      return "Package";
    case "free":
      return "Free";
    case "custom_label":
      return "Custom";
    default:
      return priceMode;
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function CourseTemplateTable({
  courseTemplates,
  locale,
  isLoading = false,
  error = null,
  onClose,
}: CourseTemplateTableProps) {
  console.log(courseTemplates);
  return (
    <div className="">
      <div className="p-1 flex flex-col sm:flex-row justify-between items-center">
        <h2 className="font-medium text-white text-md">
          Plantillas de cursos existentes
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar plantilla..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent transition-shadow"
            />
          </div>

          <Link
            href={`/${locale}/dashboard/courses/addTemplate`}
            className="w-full sm:w-auto bg-[#9e2727] hover:bg-[#a85d5d] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium text-sm"
          >
            <Plus size={18} />
            <span>Nueva Plantilla</span>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="p-8 text-center text-gray-500">
          <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
          Loading templates...
        </div>
      )}

      {error && (
        <div className="w-full flex items-center justify-center py-4 gap-2 text-red-500">
          <AlertCircle size={16} />
          Ocurrió un error {error}
        </div>
      )}

      {!isLoading &&
        !error &&
        (courseTemplates.length === 0 ||
          courseTemplates.length === undefined) && (
          <div className="flex flex-col items-center justify-center my-5">
            <div className="rounded-lg shadow-lm flex flex-col items-center justify-center gap-2 text-white">
              <p>No hay plantillas registradas.</p>
            </div>
            <div className="rounded-lg mt-4 shadow-lm flex flex-col items-center justify-center px-4 py-2 gap-2 text-gray-800 bg-amber-500">
              <p className="flex items-center justify-center gap-2">
                <Info size={14} />
                Crea una nueva. Esto te permitirá ir más rápido y mantener la
                consistencia entre cursos en el futuro.
              </p>
            </div>
          </div>
        )}

      {!isLoading && !error && courseTemplates.length > 0 && (
        <div className="overflow-x-auto bg-white my-4 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Plantilla</th>
                <th className="px-6 py-4 font-medium">Nivel</th>
                <th className="px-6 py-4 font-medium">Precio</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Actualizado</th>
                <th className="px-6 py-4 font-medium text-right">Opciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {courseTemplates.map((template) => (
                <tr
                  key={template.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {template.internalName}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {template.code}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                      {template.level}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                        {getPriceModeLabel(template.priceMode)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.currency}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <span
                        className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(template.status)}`}
                      >
                        {template.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Version {template.version}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(template.updatedAt)}
                  </td>

                  <td className="px-6 py-4 flex items-center justify-center gap-1">
                    <Link
                      href={`/${locale}/dashboard/courses/templates/${template.id}`}
                      className="bg-blue-400 text-white inline-flex items-center justify-center p-2 rounded-lg  hover:bg-blue-600 transition-colors"
                    >
                      <Eye size={18} />
                    </Link>
                    <button className="cursor-pointer bg-gray-400 text-white inline-flex items-center justify-center p-2 rounded-lg  hover:bg-red-600 transition-colors">
                      <Archive size={18} />
                    </button>
                    <Link
                      href={`/${locale}/dashboard/courses/addCourse/${template.id}`}
                      className="ms-4 bg-green-600 text-white inline-flex items-center justify-center p-2 rounded-lg  hover:bg-green-800 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="w-full flex items-center justify-end">
        <button
          onClick={onClose}
          className="text-md px-4 py-2 bg-white text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 hover:text-gray-600 transition-all duration-150 ease-in-out"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
