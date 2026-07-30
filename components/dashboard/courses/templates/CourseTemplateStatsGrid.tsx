import {
  BookOpenCheck,
  Boxes,
  LibraryBig,
  Paperclip,
} from "lucide-react";

import type { CourseTemplateStatsDTO } from "@/lib/dto/course-template.dto";

interface CourseTemplateStatsGridProps {
  stats: CourseTemplateStatsDTO;
}

export default function CourseTemplateStatsGrid({
  stats,
}: CourseTemplateStatsGridProps) {
  const items = [
    {
      label: "Módulos",
      value: stats.modulesCount,
      icon: LibraryBig,
    },
    {
      label: "Clases modelo",
      value: stats.lessonsCount,
      icon: BookOpenCheck,
    },
    {
      label: "Bloques modelo",
      value: stats.blocksCount,
      icon: Boxes,
    },
    {
      label: "Recursos",
      value: stats.resourcesCount,
      icon: Paperclip,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#9e2727]/10 text-[#9e2727]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-2xl font-semibold text-slate-900">
                {item.value}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
