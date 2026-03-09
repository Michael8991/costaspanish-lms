import Breadcrumbs from "@/components/ui/Breadcrumbs";
import dbConnect from "@/lib/mongo";
import { DBStudent } from "@/lib/types/student";
import { StudentProfile } from "@/models/StudentProfile";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronDown,
  CircleAlert,
  Clock,
  CreditCard,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  Presentation,
} from "lucide-react";
import { Types } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";

//TODO: ELiminar esto y crear la conexion real

//!Mock lessons
//TODO Eliminar y crear la conexion real
const mockRecentLessons = [
  {
    id: "l1",
    date: "14 Mar 2026",
    time: "10:00",
    title: "Conversación B2: El medio ambiente",
    status: "scheduled",
    prepStatus: "pending",
  },
  {
    id: "l2",
    date: "07 Mar 2026",
    time: "10:00",
    title: "Gramática: Subjuntivo vs Indicativo",
    status: "completed",
    prepStatus: "ready",
  },
  {
    id: "l3",
    date: "07 Mar 2026",
    time: "10:00",
    title: "Gramática: Subjuntivo vs Indicativo",
    status: "completed",
    prepStatus: "ready",
  },
  {
    id: "l4",
    date: "07 Mar 2026",
    time: "10:00",
    title: "Gramática: Subjuntivo vs Indicativo",
    status: "completed",
    prepStatus: "ready",
  },
  {
    id: "l5",
    date: "07 Mar 2026",
    time: "10:00",
    title: "Gramática: Subjuntivo vs Indicativo",
    status: "completed",
    prepStatus: "ready",
  },
];

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default async function StudentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const rawStudent = await StudentProfile.findById(id).lean();

  if (!rawStudent) {
    notFound();
  }

  const student = {
    id: rawStudent._id.toString(),
    name: rawStudent.fullName,
    email: rawStudent.contactEmail,
    phone: rawStudent.phone || "No phone",
    status: rawStudent.isActive ? "active" : "inactive",
    goals: rawStudent.goals || [],
    country: rawStudent.country || "Unknown",
    timezone: rawStudent.timezone,
    level: rawStudent.level,
    internalNotes: rawStudent.internalNotes || "No notes available.",
    nativeLanguage: rawStudent.nativeLanguage || "Unknown",
  };

  const plans = (rawStudent.activePlans || []).map((plan) => ({
    id: plan._id.toString(),
    name: plan.name,
    totalCredits: plan.creditsTotal || 0,
    remainingCredits: plan.creditsRemaining || 0,
    expiryDate: new Date(plan.validUntil).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    status: plan.status,
  }));

  const breadcrumbItems = [
    { label: "Students", href: `/${locale}/dashboard/students` },
    { label: student.name }, // Sin href, para que sea el texto final truncado
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <div className="flex items-center justify-end">
        <Link
          href={`/${locale}/dashboard/students`}
          className="flex items-center gap-2 text-sm group border rounded-lg px-2 py-1 border-gray-400 hover:bg-[#9e2727] hover:text-white transition-all transform duration-150 ease-in-out hover:border-[#9e2727]"
        >
          <ArrowLeft
            size={12}
            className="group-hover:-translate-x-1 transition-all transform duration-150 ease-in-out"
          />
          Back
        </Link>
      </div>
      {/* 2. HEADER DEL PERFIL */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
        <div className="flex flex-wrap items-center gap-6 max-md:justify-center ">
          {/* Avatar con la inicial */}
          <div className="w-20 h-20 rounded-full bg-[#9e2727]/10 border-2 border-[#9e2727]/20 flex items-center justify-center text-[#9e2727]">
            <span className="text-3xl font-bold">{student.name.charAt(0)}</span>
          </div>

          {/* Info principal */}
          <div className="flex flex-col max-md:items-center">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {student.name}
              </h1>
              {/* Badge de Estado */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                    student.status === "active"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  {student.status === "active" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  )}
                  {student.status === "active"
                    ? "Active Student"
                    : "Inactive Student"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mt-1 mb-1 max-md:justify-center">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <p>{student.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="" size={14} />
                <p>{student.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-500 italic text-xs mb-3">
              <p>
                {student.country ? student.country : ""}, {student.timezone}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mt-1 mb-3 max-md:justify-center">
              <p className="py-1 px-2 bg-orange-200 rounded-lg text-black text-xs">
                {student.nativeLanguage}
              </p>
              <p className="py-1 px-2 bg-blue-200 rounded-lg text-black text-xs">
                {student.level}
              </p>
              {student.goals.map((goal, index) => (
                <p
                  key={index}
                  className="py-1 px-2 bg-gray-200 rounded-lg text-black text-xs"
                >
                  {goal}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-end gap-4 max-md:mx-auto">
          {/* Botón de Cambiar Estado (Preparado para el Modal) */}
          <button
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium shadow-sm hover:cursor-pointer hover:bg-[#9e2727]! hover:border-[#9e2727] hover:text-white transition-colors transform duration-150 ease-in-out ${
              student.status === "active"
                ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                : "bg-[#9e2727] border-[#9e2727] text-white hover:bg-[#8a2222]"
            }`}
          >
            <AlertTriangle
              size={16}
              className={
                student.status === "active" ? "text-amber-500" : "text-white"
              }
            />
            {student.status === "active"
              ? "Deactivate Student"
              : "Activate Student"}
          </button>
          {/* //TODO: Poner enlace correcto */}
          <Link
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm bg-white border-gray-300 text-gray-700 hover:bg-green-800! hover:border-green-900 hover:text-white transform duration-150 ease-in-out`}
            href={"#"}
          >
            <Pencil size={16} />
            Edit Student
          </Link>
        </div>
      </section>
      <div className="xl:col-span-2 flex flex-col gap-6 my-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header de la sección */}
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#9e2727]" />
              <h2 className="font-semibold text-gray-900">
                Active & Past Plans
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9e2727] text-white text-sm font-medium rounded-lg hover:bg-[#8a2222] transition-colors shadow-sm cursor-pointer">
                <Plus size={16} />
                Add New Voucher
              </button>
            </div>
          </div>

          {/* Lista de Planes */}
          <div className="p-5 flex flex-col gap-4">
            {plans.map((plan) => {
              const percentage =
                (plan.remainingCredits / plan.totalCredits) * 100;
              const isLow =
                plan.remainingCredits > 0 && plan.remainingCredits <= 2;

              return (
                <div
                  key={plan.id}
                  className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors bg-white shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {plan.name}
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${
                            plan.status === "active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {plan.status}
                        </span>
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Calendar size={12} />
                        <span>Expires: {plan.expiryDate}</span>
                      </div>
                    </div>

                    <div className="text-right w-full sm:w-auto">
                      <p className="text-sm font-medium text-gray-900">
                        {plan.remainingCredits} / {plan.totalCredits} Credits
                      </p>
                      <p className="text-xs text-gray-500">Remaining</p>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        plan.status === "exhausted"
                          ? "bg-gray-300"
                          : isLow
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  {isLow && (
                    <p className="flex items-center gap-2 text-xs text-amber-600 mt-2 font-medium">
                      <CircleAlert size={14} /> Running low on credits! Time to
                      remind the student to renew.
                    </p>
                  )}
                  {/* //TODO: Enlaces reales */}
                  <div className="flex w-full items-center justify-end mt-3">
                    <Link
                      href={"#"}
                      className="items-center text-[11px] font-medium text-gray-400 hover:text-[#9e2727] transition-colors flex gap-1 mt-1 border rounded-lg border-gray-300 px-2 py-1 hover:border-[#9e2727]"
                    >
                      <Pencil size={12} /> Edit Voucher
                    </Link>
                  </div>
                </div>
              );
            })}
            <div className="flex w-full items-center justify-end">
              {/* //TODO: Agregar enlace real al historial de clases */}
              <Link
                href={`/${locale}/dashboard/students/${id}/vouchersHistory`}
                className="text-[#9e2727] text-sm flex items-center gap-2 group"
              >
                See Full Vouchers History
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-all transform duration-100 ease-in"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Recent Lessons */}
      <div className="xl:col-span-2 flex flex-col gap-6 my-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header de la sección */}
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Presentation size={18} className="text-[#9e2727]" />
              <h2 className="font-semibold text-gray-900">Recent Lessons</h2>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9e2727] text-white text-sm font-medium rounded-lg hover:bg-[#8a2222] transition-colors shadow-sm cursor-pointer">
              <Plus size={16} />
              Add New Lesson
            </button>
          </div>

          {/* Lista de clases */}
          <div className="p-5 flex flex-col gap-4">
            {mockRecentLessons.map((lesson, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors bg-white shadow-sm gap-4"
              >
                {/* Lado izquierdo: Título, Prep Status y meta-info */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-gray-900">
                      {lesson.title}
                    </h3>
                    <span
                      className={`flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-wider ${
                        lesson.prepStatus === "pending"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {lesson.prepStatus === "pending" ? (
                        <>
                          <AlertCircle size={14} /> Needs Prep
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} /> Prepped
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>{lesson.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>{lesson.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-md border text-center w-fit ${
                      statusStyles[lesson.status] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {lesson.status.charAt(0).toUpperCase() +
                      lesson.status.slice(1)}
                  </span>

                  {/* //TODO:Botón de editar clase integrado -- Agregar enlace real */}
                  <Link
                    href={"#"}
                    className="items-center text-[11px] font-medium text-gray-400 hover:text-[#9e2727] transition-colors flex gap-1 mt-1 border rounded-lg border-gray-300 px-2 py-1 hover:border-[#9e2727]"
                  >
                    <Pencil size={12} /> Edit Lesson
                  </Link>
                </div>
              </div>
            ))}
            <div className="flex w-full items-center justify-end">
              {/* //TODO: Agregar enlace real al historial de clases */}
              <Link
                href={"#"}
                className="text-[#9e2727] text-sm flex items-center gap-2 group"
              >
                See Full Lessons History
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-all transform duration-100 ease-in"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* //Internal Notes acordeon */}
      <div className="xl:col-span-2 flex flex-col gap-6 my-5">
        {/* 1. Usamos <details> nativo con la clase "group" para detectar si está abierto */}
        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
          {/* 2. El Header ahora es un <summary> (lo hace clicable por defecto) */}
          <summary className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 hover:bg-gray-100 cursor-pointer list-none transition-colors">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-[#9e2727]" />
              <h2 className="font-semibold text-gray-900">Internal Notes</h2>
            </div>

            <div className="flex items-center justify-center">
              <ChevronDown
                size={24}
                // Magia pura de Tailwind: group-open:rotate-180 gira la flecha sola
                className="text-[#9e2727] group-open:rotate-180 hover:text-white hover:bg-[#9e2727] rounded-full p-0.5 transition-all transform duration-300 ease-in-out"
              />
            </div>
          </summary>

          {/* 3. El contenido (solo se muestra cuando está abierto) */}
          <div className="p-5 bg-amber-50/50 text-gray-700 text-sm leading-relaxed border-t border-amber-100">
            {student.internalNotes || "Nada que mostrar"}
          </div>
        </details>
      </div>
    </div>
  );
}
