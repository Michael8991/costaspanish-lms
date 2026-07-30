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

  if (session.user.role === "student") {
    redirect(`/${locale}/dashboard`);
  }

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const templateId = new Types.ObjectId(id);
  const currentUserId = session.user.id;
  const templateFilter =
    session.user.role === "admin"
      ? { _id: templateId }
      : {
          _id: templateId,
          ownerTeacherId: currentUserId,
        };
  const rawCourseTemplate =
    await CourseTemplate.findOne(templateFilter).lean();

  if (!rawCourseTemplate) {
    notFound();
  }

  const courseTemplate = toCourseTemplateDetailDTO(rawCourseTemplate);

  if (courseTemplate.status === "archived") {
    redirect(
      `/${locale}/dashboard/courses/templates/${courseTemplate.id}`,
    );
  }

  const breadcrumbItems = [
    { label: "Cursos", href: `/${locale}/dashboard/courses` },
    {
      label: "Detalle de plantilla",
      href: `/${locale}/dashboard/courses/templates/${courseTemplate.id}`,
    },
    { label: `Editar ${courseTemplate.code}` },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl font-semibold">Editar plantilla de curso</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ajusta la guía pedagógica sin modificar cursos activos ni alumnos.
      </p>
      <div className="flex flex-col">
        <CourseTemplateForm
          locale={locale}
          initialData={courseTemplate}
          submitLabel="Guardar cambios"
          endpoint={`/api/course-template/${courseTemplate.id}`}
          method="PATCH"
          redirectTo={`/${locale}/dashboard/courses/templates/${courseTemplate.id}`}
          cancleHref={`/${locale}/dashboard/courses/templates/${courseTemplate.id}`}
        />
      </div>
    </div>
  );
}
