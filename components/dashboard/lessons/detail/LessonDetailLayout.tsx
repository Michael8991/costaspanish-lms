import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import LessonBlocksPanel from "./LessonBlocksPanel";
import LessonAttendancePanel from "./LessonAttendancePanel";

interface LessonDetailLayoutProps {
  lesson: LessonDetailDTO;
  resourceIds: string[];
}

export default function LessonDetailLayout({
  lesson,
  resourceIds,
}: LessonDetailLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <LessonBlocksPanel lesson={lesson} resourceIds={resourceIds} />
      <LessonAttendancePanel lesson={lesson} />
    </div>
  );
}
