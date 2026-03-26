"use client";

import { Captions, CaptionsOff, ChevronDown } from "lucide-react";
import { useState } from "react";

interface TranscriptionTextProps {
  transcription: string | undefined;
}

export default function TranscriptionPreviewSection({
  transcription,
}: TranscriptionTextProps) {
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
  return (
    <section className="rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden mt-2">
      {transcription && (
        <div className="my-5">
          <div className="flex w-full items-center">
            <button
              onClick={() => setIsTranscriptionOpen((v) => !v)}
              className="cursor-pointer flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-700 transition-colors w-full justify-between px-5 py-1"
            >
              <p className="flex items-center gap-2 ">
                <Captions size={16} color="#9e2727" />
                {isTranscriptionOpen
                  ? "Ocultar transcripción"
                  : "Ver transcripción"}
              </p>
              <ChevronDown
                size={20}
                className={`transition-transform duration-200 ${isTranscriptionOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isTranscriptionOpen
                ? "max-h-96 opacity-100 mt-3"
                : "max-h-0 opacity-0"
            }`}
          >
            <p className="text-xs leading-relaxed text-gray-700 max-w-2xl border-l-2 border-lime-500 pl-3">
              {transcription}
            </p>
          </div>
        </div>
      )}

      {!transcription && (
        <p className="flex items-center gap-2 p-2 mt-2 text-sm  italic w-full justify-center mb-1 text-[#9e2727]">
          <CaptionsOff size={16} color="#9e2727" /> Sin transcripción.
        </p>
      )}
    </section>
  );
}
