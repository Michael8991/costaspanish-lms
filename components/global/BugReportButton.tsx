"use client";
import { CircleAlert } from "lucide-react";
import CustomModal from "../ui/CustomModal";
import { useState } from "react";
import BugReportForm from "./BugReportForm";
export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = () => setIsOpen(false);
  const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";
  return (
    <>
      <div className="cursor-pointer fixed bottom-5 right-5 z-50 bg-transparent hover:scale-101 transition-transform duration-150 ease-in-out ">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <CircleAlert size={24} color={"#b22222"} />
          Informar{" "}
          {isStaging && (
            <div className="bg-amber-100 px-3 py-1 text-center text-sm font-medium text-amber-900">
              Entorno de demostración — datos ficticios
            </div>
          )}
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
