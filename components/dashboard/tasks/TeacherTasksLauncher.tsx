"use client";

import { ListTodo } from "lucide-react";
import { useState } from "react";

import { useTeacherTaskStats } from "@/lib/hooks/useTeacherTaskStats";
import TeacherTasksModal from "./TeacherTasksModal";

export default function TeacherTasksLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const { stats } = useTeacherTaskStats();
  const openTaskCount = stats?.open.total ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Tareas pendientes: ${openTaskCount}`}
        title="Tareas"
        className="relative flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30343f]"
      >
        <ListTodo size={19} />
        <span className="hidden text-sm font-medium 2xl:inline">Tareas</span>
        {openTaskCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-[#e34040] px-1 text-[10px] font-semibold leading-4.5 text-white ring-2 ring-[#30343f] 2xl:static 2xl:min-w-5 2xl:ring-0">
            {openTaskCount > 99 ? "99+" : openTaskCount}
          </span>
        )}
      </button>

      <TeacherTasksModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
