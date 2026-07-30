import type { CourseTemplateListItemDTO } from "@/lib/dto/course-template.dto";
import { getCourseTemplateStatusVisual } from "@/lib/utils/course-template-visuals";

interface CourseTemplateStatusBadgeProps {
  status: CourseTemplateListItemDTO["status"];
}

export default function CourseTemplateStatusBadge({
  status,
}: CourseTemplateStatusBadgeProps) {
  const visual = getCourseTemplateStatusVisual(status);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${visual.className}`}
    >
      {visual.label}
    </span>
  );
}
