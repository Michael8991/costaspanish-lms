import type { ClassBookRowDTO } from "@/lib/dto/class-book.dto";
import { formatCredits, formatCurrencyEUR } from "@/lib/utils/finance-format";
import {
  getAttendanceClassName,
  getAttendanceLabel,
  getClassTypeLabel,
  getLessonStatusClassName,
  getLessonStatusLabel,
  getPreparationStatusClassName,
  getPreparationStatusLabel,
} from "@/lib/utils/class-book-visuals";
import { BookOpen, ExternalLink, Paperclip } from "lucide-react";
import Link from "next/link";

interface ClassBookTableProps {
  rows: ClassBookRowDTO[];
  locale: string;
  isLoading: boolean;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(parsed);
}

function TableSkeleton() {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <div className="h-11 animate-pulse border-b border-slate-200 bg-slate-100" />
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="flex h-14 animate-pulse items-center gap-8 border-b border-slate-100 px-4 last:border-0"
        >
          {Array.from({ length: 8 }, (_, cellIndex) => (
            <span
              key={cellIndex}
              className="h-3 rounded bg-slate-100"
              style={{ width: `${45 + ((index + cellIndex) % 4) * 12}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ClassBookTable({
  rows,
  locale,
  isLoading,
}: ClassBookTableProps) {
  if (isLoading) return <TableSkeleton />;
  if (rows.length === 0) return null;

  return (
    <div className="hidden max-h-[68vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <table className="min-w-[1760px] border-separate border-spacing-0 text-left text-xs">
        <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="sticky left-0 z-30 border-b border-r border-slate-200 bg-slate-100 px-3 py-3">
              Fecha
            </th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Hora</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Curso</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Clase</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Estado</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Alumno/s</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Asistencia</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Tipo</th>
            <th className="border-b border-r border-slate-200 px-3 py-3 text-right">Previsto</th>
            <th className="border-b border-r border-slate-200 px-3 py-3 text-right">Real</th>
            <th className="border-b border-r border-slate-200 px-3 py-3 text-right">Créditos</th>
            <th className="border-b border-r border-slate-200 px-3 py-3 text-right">Devengado</th>
            <th className="border-b border-r border-slate-200 px-3 py-3">Preparación</th>
            <th className="border-b border-slate-200 px-3 py-3">Notas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group hover:bg-rose-50/30">
              <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-800 group-hover:bg-rose-50">
                {formatDate(row.date)}
              </td>
              <td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2.5 text-slate-600">
                {row.startTime ?? "—"}–{row.endTime ?? "—"}
              </td>
              <td className="max-w-44 border-b border-r border-slate-200 px-3 py-2.5 font-medium text-slate-700">
                <span className="line-clamp-2">{row.courseName}</span>
              </td>
              <td className="max-w-60 border-b border-r border-slate-200 px-3 py-2.5">
                <Link
                  href={`/${locale}/dashboard/lessons/${row.lessonId}`}
                  className="inline-flex items-center gap-1 font-semibold text-[#9e2727] hover:underline"
                >
                  <span className="line-clamp-2">{row.lessonTitle}</span>
                  <ExternalLink size={12} className="shrink-0" />
                </Link>
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5">
                <span
                  className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 font-semibold ${getLessonStatusClassName(row.status)}`}
                >
                  {getLessonStatusLabel(row.status)}
                </span>
              </td>
              <td className="max-w-52 border-b border-r border-slate-200 px-3 py-2.5 text-slate-700">
                <span className="line-clamp-2" title={row.studentsLabel}>
                  {row.studentsLabel}
                </span>
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5 text-slate-600">
                <div
                  title={row.students
                    .map(
                      (student) =>
                        `${student.name}: ${getAttendanceLabel(student.attendanceStatus)}`,
                    )
                    .join(" · ")}
                  className="min-w-32"
                >
                  <span className="block whitespace-nowrap text-[11px] text-slate-500">
                    {row.attendanceSummary}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {row.students.slice(0, 2).map((student) => (
                      <span
                        key={student.studentId}
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${getAttendanceClassName(student.attendanceStatus)}`}
                      >
                        {getAttendanceLabel(student.attendanceStatus)}
                      </span>
                    ))}
                    {row.students.length > 2 && (
                      <span className="px-1 py-0.5 text-[10px] text-slate-400">
                        +{row.students.length - 2}
                      </span>
                    )}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2.5 text-slate-600">
                {getClassTypeLabel(row.classType)}
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5 text-right tabular-nums text-slate-600">
                {row.plannedMinutes} min
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5 text-right tabular-nums text-slate-600">
                {row.actualMinutes > 0 ? `${row.actualMinutes} min` : "—"}
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                {formatCredits(row.creditsConsumed)}
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                {formatCurrencyEUR(row.estimatedRevenue)}
              </td>
              <td className="border-b border-r border-slate-200 px-3 py-2.5">
                <span
                  className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 font-semibold ${getPreparationStatusClassName(row.preparationStatus)}`}
                >
                  {getPreparationStatusLabel(row.preparationStatus)}
                </span>
              </td>
              <td className="max-w-72 border-b border-slate-200 px-3 py-2.5 text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="line-clamp-2" title={row.notesPreview}>
                    {row.notesPreview}
                  </span>
                  <span className="flex shrink-0 gap-1 text-slate-400">
                    {row.hasHomework && (
                      <BookOpen size={13} aria-label="Tiene deberes" />
                    )}
                    {row.hasResources && (
                      <Paperclip size={13} aria-label="Tiene recursos" />
                    )}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
