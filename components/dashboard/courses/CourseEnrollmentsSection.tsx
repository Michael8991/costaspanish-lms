import { Plus, UserRoundPlus, UsersRound } from "lucide-react";

import type { CourseEnrollmentListItemDTO } from "@/lib/dto/course-enrollment.dto";

type CourseEnrollmentsSectionProps = {
  enrollments: CourseEnrollmentListItemDTO[];
  onAddStudent?: () => void;
};

function formatEnrollmentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin definir";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function EnrollmentStatus({
  status,
}: {
  status: CourseEnrollmentListItemDTO["status"];
}) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export default function CourseEnrollmentsSection({
  enrollments,
  onAddStudent,
}: CourseEnrollmentsSectionProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="course-enrollments-title"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <UsersRound className="h-4 w-4" />
          </span>
          <div>
            <h2
              id="course-enrollments-title"
              className="font-semibold text-slate-900"
            >
              Alumnos matriculados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Alumnos que pertenecen a este curso.
            </p>
          </div>
        </div>
        {onAddStudent && (
          <button
            type="button"
            onClick={onAddStudent}
            className="inline-flex items-center gap-2 rounded-xl bg-[#9e2727] px-3 py-2 text-sm font-semibold text-white hover:bg-[#8d2121]"
          >
            <Plus className="h-4 w-4" />
            Añadir alumno
          </button>
        )}
      </header>

      {enrollments.length === 0 ? (
        <div className="grid justify-items-center px-5 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <UserRoundPlus className="h-5 w-5" />
          </span>
          <p className="mt-3 font-medium text-slate-800">
            Todavía no hay alumnos matriculados.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Añade el primer alumno a este curso.
          </p>
          {onAddStudent && (
            <button
              type="button"
              onClick={onAddStudent}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#9e2727] px-3 py-2 text-sm font-semibold text-[#9e2727] hover:bg-red-50"
            >
              <Plus className="h-4 w-4" />
              Añadir alumno
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 md:hidden">
            {enrollments.map((enrollment) => (
              <article key={enrollment.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {enrollment.student.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {enrollment.student.email || "Sin email"}
                    </p>
                  </div>
                  <EnrollmentStatus status={enrollment.status} />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Incorporación: {formatEnrollmentDate(enrollment.enrolledAt)}
                </p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Alumno</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-5 py-3">Incorporación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {enrollment.student.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {enrollment.student.email || "Sin email"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <EnrollmentStatus status={enrollment.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {formatEnrollmentDate(enrollment.enrolledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

