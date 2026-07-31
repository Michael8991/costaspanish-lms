import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { notFound, redirect } from "next/navigation";

import CourseProfileDetailView from "@/components/dashboard/courses/CourseProfileDetailView";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import { toCourseProfileDetailDTO } from "@/lib/utils/course-profile.mapper";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { toLessonListDTO } from "@/lib/utils/lesson.mapper";
import dbConnect from "@/lib/mongo";
import { CourseProfile } from "@/models/CourseProfile";
import { CourseTemplate } from "@/models/CourseTemplate";
import Lesson from "@/models/Lesson";
import "@/models/StudentProfile";

export default async function CourseProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ locale, id }, query] = await Promise.all([params, searchParams]);
  const session = await getServerSession(authOptions);

  if (!session?.user) return null;
  if (session.user.role === "student") {
    redirect(`/${locale}/dashboard`);
  }
  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const courseFilter =
    session.user.role === "admin"
      ? { _id: new Types.ObjectId(id) }
      : {
          _id: new Types.ObjectId(id),
          ownerTeacherId: session.user.id,
        };
  const rawCourse = await CourseProfile.findOne(courseFilter)
    .populate({
      path: "members.studentId",
      select: "fullName contactEmail level isActive activePlans",
      ...(session.user.role === "admin"
        ? {}
        : { match: { teacherId: new Types.ObjectId(session.user.id) } }),
    })
    .populate({
      path: "studentIds",
      select: "fullName contactEmail level isActive",
      ...(session.user.role === "admin"
        ? {}
        : { match: { teacherId: new Types.ObjectId(session.user.id) } }),
    })
    .lean();

  if (!rawCourse) notFound();

  const [rawTemplate, rawCreatedLessons] = await Promise.all([
    CourseTemplate.findById(rawCourse.templateId).lean(),
    Lesson.find(
      session.user.role === "admin"
        ? { courseId: rawCourse._id }
        : {
            courseId: rawCourse._id,
            teacherId: new Types.ObjectId(session.user.id),
          },
    )
      .sort({ scheduledStart: -1 })
      .limit(100)
      .lean(),
  ]);
  const template = rawTemplate
    ? toCourseTemplateDetailDTO(rawTemplate)
    : null;
  const course = toCourseProfileDetailDTO(rawCourse, {
    templateOperationalDefaults: template?.operationalDefaults,
  });
  const createdLessons = rawCreatedLessons.map(toLessonListDTO);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-gray-800 md:px-8">
      <Breadcrumbs
        items={[
          { label: "Cursos", href: `/${locale}/dashboard/courses` },
          { label: course.name },
        ]}
        locale={locale}
      />
      <CourseProfileDetailView
        initialCourse={course}
        template={template}
        locale={locale}
        createdLessons={createdLessons}
        initialEdit={query.edit === "1"}
      />
    </div>
  );
}
