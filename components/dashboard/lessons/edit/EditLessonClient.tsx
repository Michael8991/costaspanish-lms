"use client";

import { mapLessonToFormValues } from "@/lib/dto/lesson.dto";
import { useLessonDetail } from "@/lib/hooks/useLessonDetail";
import AddLessonWizard from "@/app/[locale]/dashboard/lessons/add/AddLessonWizard";

interface EditLessonClientProps {
  locale: string;
  lessonId: string;
}

export default function EditLessonClient({
  locale,
  lessonId,
}: EditLessonClientProps) {
  const { lesson, isLoading, error } = useLessonDetail(lessonId);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando clase...</p>;
  }

  if (error || !lesson) {
    return (
      <p className="text-sm text-red-600">
        {error ?? "No se pudo cargar la clase."}
      </p>
    );
  }

  return (
    <AddLessonWizard
      locale={locale}
      mode="edit"
      lessonId={lesson.id}
      initialValues={mapLessonToFormValues(lesson)}
    />
  );
}
