"use client";
import { CircleAlert } from "lucide-react";
import CustomModal from "../ui/CustomModal";
import { useState } from "react";
import BugReportForm from "./BugReportForm";
export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = () => setIsOpen(false);
  return (
    <>
      <div className="cursor-pointer fixed bottom-5 right-5 z-50 bg-transparent hover:scale-101 transition-transform duration-150 ease-in-out ">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <CircleAlert size={24} color={"#b22222"} />
          Informar
        </button>
      </div>
      <CustomModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Informar de un problema"
        maxWidth="md"
      >
        <BugReportForm onClose={closeModal} />
      </CustomModal>
    </>
  );
}
