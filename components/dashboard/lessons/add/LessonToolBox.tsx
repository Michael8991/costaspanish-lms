"use client";

import { BookMarked, Route, ToolCase } from "lucide-react";
import CustomModal from "../../../ui/CustomModal";
import { useState } from "react";
import { useResources } from "@/lib/hooks/useResources";
import ResourceSelector from "./ResourceSelector";

export default function LessonToolBox() {
  const [isResourcesModalOpen, setIsResourcesModalOpen] = useState(false);

  return (
    <div className="w-full flex flex-col items-center justify-start rounded-xl py-6 px-1 border border-gray-200 shadow-sm gap-2">
      <button
        className="cursor-pointer p-2 border border-gray-200 rounded-xl hover:border-[#9e2727] hover:text-[#9e2727] transition-colors duration-150 ease-in-out"
        onClick={() => setIsResourcesModalOpen(true)}
      >
        <ToolCase size={24} />
      </button>
      <button className="cursor-pointer p-2 border border-gray-200 rounded-xl hover:border-[#9e2727] hover:text-[#9e2727] transition-colors duration-150 ease-in-out">
        <Route size={24} />
      </button>
      <button className="cursor-pointer p-2 border border-gray-200 rounded-xl hover:border-[#9e2727] hover:text-[#9e2727] transition-colors duration-150 ease-in-out">
        <BookMarked size={24} />
      </button>
      <CustomModal
        isOpen={isResourcesModalOpen}
        onClose={() => setIsResourcesModalOpen(false)}
        title="Selector de recursos"
        maxWidth="5xl"
      >
        <div className="p-4">
          <ResourceSelector onClose={() => setIsResourcesModalOpen(false)} />
        </div>
      </CustomModal>
    </div>
  );
}
