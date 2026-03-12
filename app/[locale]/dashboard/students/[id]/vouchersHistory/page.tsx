import { Types } from "mongoose";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongo";
import { PlanDoc, StudentProfile } from "@/models/StudentProfile";
import VouchersTable from "@/components/dashboard/teacher/students/VouchersTable";
import BasicStudentHeader from "@/components/dashboard/teacher/students/BasicStudentHeader";
import { DBPlanDoc } from "@/lib/types/student";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VouchersHistory({
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
    activePlans: (rawStudent.activePlans || []).map(
      (plan: PlanDoc): DBPlanDoc => ({
        _id: plan._id.toString(),
        name: plan.name,
        billingType: plan.billingType,
        classType: plan.classType,
        creditsTotal: plan.creditsTotal,
        creditsRemaining: plan.creditsRemaining,
        validFrom: plan.validFrom,
        validUntil: plan.validUntil,
        status: plan.status,
        price: plan.price,
      }),
    ),
  };
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <BasicStudentHeader locale={locale} id={id} student={student} />
      <VouchersTable id={id} student={student.name} />
    </div>
  );
}
