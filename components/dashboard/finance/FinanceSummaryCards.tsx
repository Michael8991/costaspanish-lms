import {
  ArrowLeftRight,
  Banknote,
  ChartNoAxesColumnIncreasing,
  CircleAlert,
  Coins,
  type LucideIcon,
} from "lucide-react";

import type { FinanceMonthlySummaryDTO } from "@/lib/dto/finance.dto";
import {
  formatCredits,
  formatCurrencyEUR,
} from "@/lib/utils/finance-format";

type SummaryCard = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackground: string;
};

export default function FinanceSummaryCards({
  summary,
  isLoading,
  error,
}: {
  summary: FinanceMonthlySummaryDTO | null;
  isLoading: boolean;
  error: string | null;
}) {
  const movements = summary
    ? summary.activePaymentEntries + summary.activeCreditEntries
    : 0;
  const cards: SummaryCard[] = [
    {
      title: "Cobrado este mes",
      value: summary ? formatCurrencyEUR(summary.collectedAmount) : "—",
      description:
        "Entradas reales de dinero registradas por bonos pagados o parciales.",
      icon: Banknote,
      iconClassName: "text-emerald-700",
      iconBackground: "bg-emerald-50",
    },
    {
      title: "Devengado por clases",
      value: summary
        ? formatCurrencyEUR(summary.earnedEstimatedAmount)
        : "—",
      description:
        "Valor estimado de los créditos consumidos en clases completadas.",
      icon: ChartNoAxesColumnIncreasing,
      iconClassName: "text-blue-700",
      iconBackground: "bg-blue-50",
    },
    {
      title: "Créditos consumidos",
      value: summary ? formatCredits(summary.consumedCredits) : "—",
      description: "Créditos descontados en clases completadas.",
      icon: Coins,
      iconClassName: "text-amber-700",
      iconBackground: "bg-amber-50",
    },
    {
      title: "Movimientos",
      value: summary ? formatCredits(movements) : "—",
      description: "Cobros y devengos registrados este mes.",
      icon: ArrowLeftRight,
      iconClassName: "text-violet-700",
      iconBackground: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <CircleAlert size={17} aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-600">
                    {card.title}
                  </p>
                  {isLoading ? (
                    <div className="mt-3 h-8 w-28 animate-pulse rounded-md bg-slate-200" />
                  ) : (
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {card.value}
                    </p>
                  )}
                </div>
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${card.iconBackground} ${card.iconClassName}`}
                >
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {card.description}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
