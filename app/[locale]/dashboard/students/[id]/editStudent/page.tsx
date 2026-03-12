import EditStudentForm from "@/components/dashboard/teacher/forms/EditStudentForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import dbConnect from "@/lib/mongo";
import { StudentProfile } from "@/models/StudentProfile";
import { ArrowLeft } from "lucide-react";
import { Types } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditStudent({
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
    fullName: rawStudent.fullName,
    contactEmail: rawStudent.contactEmail,
    phone: rawStudent.phone || "",
    isActive: rawStudent.isActive ?? false,
    goals: rawStudent.goals || [],
    country: rawStudent.country || "",
    timezone: rawStudent.timezone,
    level: rawStudent.level,
    internalNotes: rawStudent.internalNotes || "",
    nativeLanguage: rawStudent.nativeLanguage || "",
  };

  const breadcrumbItems = [
    { label: "Students", href: `/${locale}/dashboard/students` },
    { label: student.fullName, href: `/${locale}/dashboard/students/${id}` },
    { label: "Editar perfil" },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <div className="flex items-center justify-end">
        <Link
          href={`/${locale}/dashboard/students/${id}`}
          className="flex items-center gap-2 text-sm group border rounded-lg px-2 py-1 border-gray-400 hover:bg-[#9e2727] hover:text-white transition-all transform duration-150 ease-in-out hover:border-[#9e2727]"
        >
          <ArrowLeft
            size={12}
            className="group-hover:-translate-x-1 transition-all transform duration-150 ease-in-out"
          />
          Back
        </Link>
      </div>
      <EditStudentForm locale={locale} student={student} />
    </div>
  );
}
