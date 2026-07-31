import type { ClassBookRowDTO } from "@/lib/dto/class-book.dto";
import { formatCredits, formatCurrencyEUR } from "@/lib/utils/finance-format";
import {
  getLessonStatusClassName,
  getLessonStatusLabel,
} from "@/lib/utils/class-book-visuals";
import { ArrowRight, CalendarDays, Clock3, Users } from "lucide-react";
import Link from "next/link";

interface ClassBookMobileCardsProps {
  rows: ClassBookRowDTO[];
  locale: string;
  isLoading: boolean;
}

function formatMobileDate(date: string | null): string {
  if (!date) return "Fecha sin definir";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "Fecha sin definir";
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

export default function ClassBookMobileCards({
  rows,
  locale,
  isLoading,
}: ClassBookMobileCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-1/2 rounded bg-slate-100" />
            <div className="mt-8 h-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarDays size={13} /> {formatMobileDate(row.date)}
                <span className="text-slate-300">·</span>
                <Clock3 size={13} /> {row.startTime ?? "—"}
              </p>
              <h2 className="mt-2 line-clamp-2 font-semibold text-slate-950">
                {row.lessonTitle}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-500">
                {row.courseName}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${getLessonStatusClassName(row.status)}`}
            >
              {getLessonStatusLabel(row.status)}
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <Users size={14} className="text-slate-400" />
              <span className="line-clamp-1">{row.studentsLabel}</span>
            </p>
            <p className="mt-1 pl-5 text-xs text-slate-500">
              {row.attendanceSummary}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Créditos</p>
              <p className="font-semibold text-slate-900">
                {formatCredits(row.creditsConsumed)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Devengado</p>
              <p className="font-semibold text-slate-900">
                {formatCurrencyEUR(row.estimatedRevenue)}
              </p>
            </div>
          </div>

          <Link
            href={`/${locale}/dashboard/lessons/${row.lessonId}`}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#9e2727] hover:text-[#9e2727]"
          >
            Ver detalle <ArrowRight size={15} />
          </Link>
        </article>
      ))}
    </div>
  );
}
