"use client";

import { useLessonDetail } from "@/lib/hooks/useLessonDetail";
import { Clock3, ExternalLink, UserCheck, Users } from "lucide-react";
import LessonDetailHeader from "./LessonDetailHeader";
import { getTotalResources } from "@/lib/utils/lessonDetail-helpers";
import LessonDetailLayout from "./LessonDetailLayout";

interface LessonDetailClientProps {
  locale: string;
  lessonId: string;
}

export default function LessonDetailClient({
  locale,
  lessonId,
}: LessonDetailClientProps) {
  const { lesson, isLoading, error } = useLessonDetail(lessonId);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Cargando lección...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Lección no encontrada.
      </div>
    );
  }

  const resourceIds = getTotalResources(lesson.blocks);
  const totalCredits = lesson.attendees.reduce(
    (total, attendee) => total + (attendee.creditsToConsume ?? 0),
    0,
  );

  return (
    <div className="space-y-6 mt-4">
      <LessonDetailHeader
        locale={locale}
        lesson={lesson}
        resourceIds={resourceIds}
        totalCredits={totalCredits}
      />
      <LessonDetailLayout lesson={lesson} resourceIds={resourceIds} />
    </div>
  );
}
