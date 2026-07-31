import { UsersRound, WalletCards } from "lucide-react";

import type { CourseMemberDTO } from "@/lib/dto/course-profile.dto";
import {
  formatBillingPeriod,
  getVoucherPaymentStatusClassName,
  getVoucherPaymentStatusLabel,
} from "@/lib/utils/voucher-visuals";

interface CourseProfileMembersSectionProps {
  members: CourseMemberDTO[];
  onCreateVouchers?: () => void;
  onCreateVoucher?: (studentId: string) => void;
  onEditVoucher?: (member: CourseMemberDTO) => void;
}

const STATUS_LABELS: Record<CourseMemberDTO["status"], string> = {
  active: "Activo",
  paused: "Pausado",
  left: "Baja",
};

const STATUS_CLASSES: Record<CourseMemberDTO["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  left: "border-slate-200 bg-slate-100 text-slate-600",
};

function formatMemberDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function MemberStatusBadge({
  status,
}: {
  status: CourseMemberDTO["status"];
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function getBillingCycleLabel(member: CourseMemberDTO) {
  const anchor = member.billing.billingAnchorDay;
  return anchor
    ? `Ciclo individual · día ${anchor}`
    : "Ciclo individual";
}

function isFirstVoucherPending(member: CourseMemberDTO) {
  return (
    !member.billing.billingStartedAt &&
    !member.billing.firstVoucherId
  );
}

export default function CourseProfileMembersSection({
  members,
  onCreateVouchers,
  onCreateVoucher,
  onEditVoucher,
}: CourseProfileMembersSectionProps) {
  const hasActiveMembers = members.some((member) => member.status === "active");

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <UsersRound className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Integrantes</h2>
            <p className="mt-1 text-sm text-slate-500">
              La facturación se calculará individualmente por alumno cuando se
              creen bonos desde el curso.
            </p>
          </div>
          </div>
          {onCreateVouchers && (
            <button
              type="button"
              onClick={onCreateVouchers}
              disabled={!hasActiveMembers}
              className="inline-flex items-center gap-2 rounded-xl bg-[#9e2727] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <WalletCards className="h-4 w-4" />
              Crear bonos del curso
            </button>
          )}
        </div>
      </header>

      {members.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          Este curso todavía no tiene integrantes.
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 md:hidden">
            {members.map((member) => (
              <article key={member.studentId} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {member.studentName}
                    </p>
                    {member.studentEmail && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {member.studentEmail}
                      </p>
                    )}
                  </div>
                  <MemberStatusBadge status={member.status} />
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-400">Entrada</dt>
                    <dd className="mt-1 text-slate-700">
                      {formatMemberDate(member.joinedAt) ?? "Sin definir"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Ciclo</dt>
                    <dd className="mt-1 text-slate-700">
                      {getBillingCycleLabel(member)}
                    </dd>
                    {isFirstVoucherPending(member) && (
                      <dd className="mt-1 text-xs text-amber-700">
                        Primer bono pendiente
                      </dd>
                    )}
                    {member.billing.billingStartedAt && (
                      <dd className="mt-1 text-xs text-slate-500">
                        Desde {formatMemberDate(member.billing.billingStartedAt)}
                      </dd>
                    )}
                    {member.billing.firstVoucherId && (
                      <dd className="mt-1 text-xs text-slate-400">
                        Inicial …{member.billing.firstVoucherId.slice(-6)}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      Próxima facturación
                    </dt>
                    <dd className="mt-1 text-slate-700">
                      {formatMemberDate(member.billing.nextBillingDate) ??
                        "Sin próxima fecha todavía"}
                    </dd>
                    {member.billing.lastVoucherId && (
                      <dd className="mt-1 text-xs text-slate-400">
                        Último bono …{member.billing.lastVoucherId.slice(-6)}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Notas</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-700">
                      {member.billing.notes || "—"}
                    </dd>
                  </div>
                </dl>
                {member.status === "active" && onCreateVoucher && (
                  <button
                    type="button"
                    onClick={() => onCreateVoucher(member.studentId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <WalletCards className="h-4 w-4" />
                    Crear bono
                  </button>
                )}
                {member.lastVoucher && onEditVoucher && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">Último bono</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${getVoucherPaymentStatusClassName(member.lastVoucher.paymentStatus)}`}>
                        {getVoucherPaymentStatusLabel(member.lastVoucher.paymentStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatBillingPeriod(member.lastVoucher.billingPeriodStart, member.lastVoucher.billingPeriodEnd)} · {member.lastVoucher.creditsRemaining} cr. restantes
                    </p>
                    <button type="button" onClick={() => onEditVoucher(member)} className="mt-2 text-xs font-semibold text-[#9e2727]">Editar último bono</button>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Alumno</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Ciclo</th>
                  <th className="px-4 py-3">Próxima facturación</th>
                  <th className="px-5 py-3">Notas</th>
                  {onCreateVoucher && <th className="px-5 py-3">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.studentId} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {member.studentName}
                      </p>
                      {member.studentEmail && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {member.studentEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <MemberStatusBadge status={member.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatMemberDate(member.joinedAt) ?? "Sin definir"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-700">
                        {getBillingCycleLabel(member)}
                      </p>
                      {isFirstVoucherPending(member) && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-700">
                          <WalletCards className="h-3.5 w-3.5" />
                          Primer bono pendiente
                        </p>
                      )}
                      {member.billing.billingStartedAt && (
                        <p className="mt-1 text-xs text-slate-500">
                          Desde {formatMemberDate(member.billing.billingStartedAt)}
                        </p>
                      )}
                      {member.billing.firstVoucherId && (
                        <p className="mt-1 text-xs text-slate-400">
                          Inicial …{member.billing.firstVoucherId.slice(-6)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatMemberDate(member.billing.nextBillingDate) ??
                        "Sin próxima fecha todavía"}
                      {member.billing.lastVoucherId && (
                        <p className="mt-1 text-xs text-slate-400">
                          Último bono …{member.billing.lastVoucherId.slice(-6)}
                        </p>
                      )}
                      {member.lastVoucher && (
                        <div className="mt-2 text-xs">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 ${getVoucherPaymentStatusClassName(member.lastVoucher.paymentStatus)}`}>
                            {getVoucherPaymentStatusLabel(member.lastVoucher.paymentStatus)}
                          </span>
                          <p className="mt-1 text-slate-500">
                            {formatBillingPeriod(member.lastVoucher.billingPeriodStart, member.lastVoucher.billingPeriodEnd)}
                          </p>
                          <p className="mt-1 text-slate-500">
                            {member.lastVoucher.creditsRemaining} créditos restantes
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="max-w-56 px-5 py-4 whitespace-pre-wrap text-slate-700">
                      {member.billing.notes || "—"}
                    </td>
                    {onCreateVoucher && (
                      <td className="px-5 py-4">
                        {member.status === "active" && (
                          <button
                            type="button"
                            onClick={() => onCreateVoucher(member.studentId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#9e2727] hover:text-[#9e2727]"
                          >
                            <WalletCards className="h-3.5 w-3.5" />
                            Crear bono
                          </button>
                        )}
                        {member.lastVoucher && onEditVoucher && (
                          <button
                            type="button"
                            onClick={() => onEditVoucher(member)}
                            className="mt-2 block text-xs font-semibold text-[#9e2727]"
                          >
                            Editar último bono
                          </button>
                        )}
                      </td>
                    )}
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
