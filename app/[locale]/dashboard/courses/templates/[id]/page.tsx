import Breadcrumbs from "@/components/ui/Breadcrumbs";
import dbConnect from "@/lib/mongo";
import { CourseTemplate } from "@/models/CourseTemplate";
import { Types } from "mongoose";
import { notFound, redirect } from "next/navigation";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CourseTemplateDetailView from "@/components/dashboard/courseTemplate/CourseTemplateDetailView";

export default async function CourseTemplateDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  if (session.user.role === "student") {
    redirect(`/${locale}/dashboard`);
  }

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const templateId = new Types.ObjectId(id);
  const templateFilter =
    session.user.role === "admin"
      ? { _id: templateId }
      : {
          _id: templateId,
          ownerTeacherId: session.user.id,
        };
  const rawCourseTemplate =
    await CourseTemplate.findOne(templateFilter).lean();

  if (!rawCourseTemplate) {
    notFound();
  }

  const courseTemplate = toCourseTemplateDetailDTO(rawCourseTemplate);

  const breadcrumbItems = [
    { label: "Cursos", href: `/${locale}/dashboard/courses` },
    { label: `Plantilla ${courseTemplate.code}` },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <div className="flex flex-col">
        <CourseTemplateDetailView
          courseTemplate={courseTemplate}
          locale={locale}
        />
      </div>
    </div>
  );
}
