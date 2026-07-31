import type { ClassBookSummaryDTO } from "@/lib/dto/class-book.dto";
import { formatCredits, formatCurrencyEUR } from "@/lib/utils/finance-format";
import {
  BookOpenCheck,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Coins,
  Users,
  type LucideIcon,
} from "lucide-react";

interface ClassBookSummaryCardsProps {
  summary: ClassBookSummaryDTO | null;
  isLoading: boolean;
}

interface SummaryCard {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  iconClassName: string;
}

export default function ClassBookSummaryCards({
  summary,
  isLoading,
}: ClassBookSummaryCardsProps) {
  if (isLoading) {
    return (
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-4 h-7 w-14 rounded bg-slate-200" />
            <div className="mt-3 h-2.5 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </section>
    );
  }

  if (!summary) return null;

  const cards: SummaryCard[] = [
    {
      label: "Clases del mes",
      value: String(summary.totalLessons),
      helper: `${summary.totalPlannedMinutes} min previstos`,
      icon: CalendarDays,
      iconClassName: "bg-slate-100 text-slate-700",
    },
    {
      label: "Completadas",
      value: String(summary.completedLessons),
      helper: `${summary.totalActualMinutes} min registrados`,
      icon: BookOpenCheck,
      iconClassName: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Planificadas",
      value: String(summary.scheduledLessons + summary.inProgressLessons),
      helper: `${summary.inProgressLessons} en curso`,
      icon: Clock3,
      iconClassName: "bg-blue-50 text-blue-700",
    },
    {
      label: "Créditos consumidos",
      value: formatCredits(summary.totalCreditsConsumed),
      helper: "Según ledger o settlement",
      icon: Coins,
      iconClassName: "bg-amber-50 text-amber-700",
    },
    {
      label: "Devengado",
      value: formatCurrencyEUR(summary.totalEstimatedRevenue),
      helper: "Valor estimado",
      icon: CircleDollarSign,
      iconClassName: "bg-violet-50 text-violet-700",
    },
    {
      label: "Alumnos",
      value: String(summary.totalStudents),
      helper: "Alumnos únicos",
      icon: Users,
      iconClassName: "bg-rose-50 text-rose-700",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${card.iconClassName}`}
              >
                <Icon size={16} />
              </span>
            </div>
            <p className="mt-2 truncate text-2xl font-semibold text-slate-950">
              {card.value}
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {card.helper}
            </p>
          </article>
        );
      })}
    </section>
  );
}
