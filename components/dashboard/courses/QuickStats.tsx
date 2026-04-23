import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongo";
import { CourseProfile } from "@/models/CourseProfile";
import { StudentProfile } from "@/models/StudentProfile";
import {
  CircleCheckBig,
  MonitorCheck,
  UserRoundCheck,
  UserRoundPlus,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function QuickStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === "student") {
    redirect(`/en/dashboard`);
  }
  let activeCourses = 0;
  let publishedCourses = 0;
  let assignedStudents = 0;
  let enrollmentOpen = 0;
  let regularGroups = 0;
  let intensiveGroups = 0;
  let semiIntensiveGroups = 0;
  let privateGroups = 0;

  try {
    await dbConnect();
    [
      activeCourses,
      publishedCourses,
      assignedStudents,
      enrollmentOpen,
      regularGroups,
      intensiveGroups,
      semiIntensiveGroups,
      privateGroups,
    ] = await Promise.all([
      CourseProfile.countDocuments({ status: "active" }),
      CourseProfile.countDocuments({ "storefront.isPublished": true }),
      StudentProfile.countDocuments({ active: true }), //Todo: implementar funcion correcta
      CourseProfile.countDocuments({
        "publicationMeta.enrollmentOpen": true,
      }),
      CourseProfile.countDocuments({ courseType: "regular_group" }),
      CourseProfile.countDocuments({ courseType: "intensive_group" }),
      CourseProfile.countDocuments({ courseType: "semi-intensive_group" }),
      CourseProfile.countDocuments({ courseType: "private_flexible" }),
    ]);
  } catch (error) {
    console.error("Error fetching summary stats:", error);
  }

  const stats = [
    {
      title: "Cursos Activos",
      value: activeCourses.toString(),
      icon: CircleCheckBig,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      title: "Cursos publicados",
      value: publishedCourses.toString(),
      icon: MonitorCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Estudiantes asignados",
      value: assignedStudents.toString(),
      icon: UserRoundCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      title: "Inscripciones abiertas",
      value: enrollmentOpen.toString(),
      icon: UserRoundPlus,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
  ];
  const groupsStats = [
    {
      title: "Grupos regulares",
      value: regularGroups.toString(),
    },
    {
      title: "Grupos intensivos",
      value: intensiveGroups.toString(),
    },
    {
      title: "Grupos semi-intensivos",
      value: semiIntensiveGroups.toString(),
    },
    {
      title: "Grupos privados",
      value: privateGroups.toString(),
    },
  ];

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2 mb-4 items-center">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`bg-white p-6 rounded-xl shadow-sm border ${stat.border} flex items-center justify-center gap-5 transition-transform hover:-translate-y-1 duration-200 hover:cursor-pointer min-h-35`}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-1 mb-10 items-center">
        {groupsStats.map((stat, i) => {
          return (
            <div
              key={i}
              className={`bg-white px-4 py-2 rounded-md shadow-sm border ${stat.value != "0" ? "border-green-500" : "border-gray-300"} flex items-center justify-center gap-5 transition-transform hover:-translate-y-1 duration-200 hover:cursor-pointer`}
            >
              <p className="text-sm text-gray-700 flex items-center justify-center">
                {stat.title}: {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
