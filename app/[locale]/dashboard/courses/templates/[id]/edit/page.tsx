import CourseTemplateForm from "@/components/dashboard/courseTemplate/CourseTemplateForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongo";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { CourseTemplate } from "@/models/CourseTemplate";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

export default async function EditCourseTemplatePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  if (!session?.user || session.user.role === "student") {
    redirect(`/${locale}/dashboard`);
  }

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const rawCourseTemplate = await CourseTemplate.findById(id).lean();

  if (!rawCourseTemplate) {
    notFound();
  }

  const courseTemplate = toCourseTemplateDetailDTO(rawCourseTemplate);

  const breadcrumbItems = [
    { label: "Courses", href: `/${locale}/dashboard/courses` },
    {
      label: "`Details Course",
      href: `/${locale}/dashboard/courses/templates/${courseTemplate.id}`,
    },
    { label: `Edit ${courseTemplate.code}` },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Detalles de plantilla de curso</h1>
      <div className="flex flex-col">
        <CourseTemplateForm locale={locale} />
      </div>
    </div>
  );
}
