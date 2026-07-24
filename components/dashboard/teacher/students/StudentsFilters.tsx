"use client";

import { Search, Trash2 } from "lucide-react";

interface StudentsFiltersProps {
  search: string;
  level: string;
  status: string;
  planType: string;
  classType: string;
  planHealth: string;
  onSearchChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPlanTypeChange: (value: string) => void;
  onClassTypeChange: (value: string) => void;
  onPlanHealthChange: (value: string) => void;
  onClearFilters: () => void;
}

type FilterOption = {
  value: string;
  label: string;
};

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

const LEVEL_OPTIONS: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const PLAN_TYPE_OPTIONS: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "single", label: "Clase suelta" },
  { value: "package", label: "Bono / paquete" },
  { value: "subscription", label: "Suscripción" },
];

const CLASS_TYPE_OPTIONS: FilterOption[] = [
  { value: "", label: "Todas" },
  { value: "private", label: "Privada" },
  { value: "pair", label: "Pareja" },
  { value: "group_regular", label: "Grupo" },
  { value: "semi_intensive", label: "Semi-intensivo" },
  { value: "intensive", label: "Intensivo" },
];

const PLAN_HEALTH_OPTIONS: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "expiring_soon", label: "Por terminar" },
  { value: "low_credits", label: "Créditos bajos" },
  { value: "no_active_plan", label: "Sin bono activo" },
];

function getOptionLabel(options: FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-shadow focus:border-transparent focus:ring-2 focus:ring-[#9e2727]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function StudentsFilters({
  search,
  level,
  status,
  planType,
  classType,
  planHealth,
  onSearchChange,
  onLevelChange,
  onStatusChange,
  onPlanTypeChange,
  onClassTypeChange,
  onPlanHealthChange,
  onClearFilters,
}: StudentsFiltersProps) {
  const hasActiveFilters = Boolean(
    search.trim() || level || status || planType || classType || planHealth,
  );
  const activeFilters = [
    search.trim() ? `Búsqueda: ${search.trim()}` : "",
    level ? `Nivel: ${getOptionLabel(LEVEL_OPTIONS, level)}` : "",
    status ? `Estado: ${getOptionLabel(STATUS_OPTIONS, status)}` : "",
    planType
      ? `Tipo de bono: ${getOptionLabel(PLAN_TYPE_OPTIONS, planType)}`
      : "",
    classType
      ? `Tipo de clase: ${getOptionLabel(CLASS_TYPE_OPTIONS, classType)}`
      : "",
    planHealth
      ? `Estado del bono: ${getOptionLabel(PLAN_HEALTH_OPTIONS, planHealth)}`
      : "",
  ].filter(Boolean);

  return (
    <section
      aria-label="Filtros de estudiantes"
      className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 ">
        <label
          htmlFor="student-search"
          className="flex min-w-0 flex-col gap-1 sm:col-span-2"
        >
          <span className="text-xs font-medium text-gray-600">Estudiante</span>
          <span className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              id="student-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar alumno..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-shadow focus:border-transparent focus:ring-2 focus:ring-[#9e2727]"
            />
          </span>
        </label>

        <FilterSelect
          id="student-level"
          label="Nivel"
          value={level}
          options={LEVEL_OPTIONS}
          onChange={onLevelChange}
        />
        <FilterSelect
          id="student-status"
          label="Estado"
          value={status}
          options={STATUS_OPTIONS}
          onChange={onStatusChange}
        />
        <FilterSelect
          id="student-plan-type"
          label="Tipo de bono"
          value={planType}
          options={PLAN_TYPE_OPTIONS}
          onChange={onPlanTypeChange}
        />
        <FilterSelect
          id="student-class-type"
          label="Tipo de clase"
          value={classType}
          options={CLASS_TYPE_OPTIONS}
          onChange={onClassTypeChange}
        />
        <FilterSelect
          id="student-plan-health"
          label="Estado del bono"
          value={planHealth}
          options={PLAN_HEALTH_OPTIONS}
          onChange={onPlanHealthChange}
        />

        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="cursor-pointer flex items-center justify-center gap-2 self-end rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-[#9e2727] hover:bg-red-50 hover:text-[#9e2727] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-600"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-xs font-medium text-gray-500">
            Filtros activos:
          </span>
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-[#9e2727]"
            >
              {filter}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
