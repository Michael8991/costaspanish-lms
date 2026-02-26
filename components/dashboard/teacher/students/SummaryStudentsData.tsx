import { authOptions } from "@/lib/auth";
import { AlertCircle, GraduationCap, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function SummaryStudentsData() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === "student") {
    redirect(`/en/dashboard`);
  }

  //   // 1. Te conectas a la base de datos
  //   await dbConnect();

  //   // 2. Cuentas los alumnos activos
  //   const activeCount = await StudentProfile.countDocuments({ isActive: true });

  //   // 3. Cuentas los que tienen nivel "Evaluando"
  //   const pendingLevelCount = await StudentProfile.countDocuments({
  //     level: "Evaluando",
  //     isActive: true,
  //   });

  //   // 4. ¡LA MAGIA DE MONGODB! Cuentas los que tienen algún bono con 2 clases o menos
  //   const expiringPlansCount = await StudentProfile.countDocuments({
  //     activePlans: {
  //       $elemMatch: {
  //         status: "active",
  //         creditsRemaining: { $lte: 2 }, // $lte significa "Less Than or Equal" (Menor o igual a 2)
  //       },
  //     },
  //   });

  const stats = [
    {
      title: "Alumnos Activos",
      // value: activeCount.toString()
      value: "24",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Bonos que terminarán pronto",
      // value: expiringPlanCount.toString()
      value: "3",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      title: "Nivel Pendiente",
      // value: pendingLevelCount.toString()
      value: "2",
      icon: GraduationCap,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`bg-white p-6 rounded-xl shadow-sm border ${stat.border} flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200 hover:cursor-pointer`}
            >
              <div className={`p-4 rounded-full ${stat.bg}`}>
                <Icon className={stat.color} size={28} strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
