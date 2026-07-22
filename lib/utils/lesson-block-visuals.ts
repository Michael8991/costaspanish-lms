import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import {
  AudioLines,
  Blocks,
  BookOpen,
  ClipboardCheck,
  FileText,
  Gamepad2,
  Headphones,
  MessageCircle,
  PencilLine,
  RotateCcw,
  Sparkles,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface LessonBlockVisual {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
  iconClassName: string;
  borderClassName?: string;
  softBackgroundClassName?: string;
}

export function getLessonBlockTypeVisual(
  type?: string | null,
): LessonBlockVisual {
  switch (type) {
    case "warm_up":
      return {
        label: "Calentamiento",
        icon: Sparkles,
        badgeClassName: "bg-amber-50 text-amber-700 ring-amber-100",
        iconClassName: "bg-amber-100 text-amber-700",
      };
    case "grammar":
      return {
        label: "Gramática",
        icon: BookOpen,
        badgeClassName: "bg-blue-50 text-blue-700 ring-blue-100",
        iconClassName: "bg-blue-100 text-blue-700",
      };
    case "vocabulary":
      return {
        label: "Vocabulario",
        icon: Tags,
        badgeClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        iconClassName: "bg-emerald-100 text-emerald-700",
      };
    case "speaking":
    case "roleplay":
    case "feedback":
      return {
        label:
          type === "roleplay"
            ? "Roleplay"
            : type === "feedback"
              ? "Feedback"
              : "Speaking",
        icon: MessageCircle,
        badgeClassName: "bg-purple-50 text-purple-700 ring-purple-100",
        iconClassName: "bg-purple-100 text-purple-700",
      };
    case "listening":
      return {
        label: "Listening",
        icon: Headphones,
        badgeClassName: "bg-indigo-50 text-indigo-700 ring-indigo-100",
        iconClassName: "bg-indigo-100 text-indigo-700",
      };
    case "reading":
    case "cultural_note":
      return {
        label: type === "cultural_note" ? "Nota cultural" : "Reading",
        icon: FileText,
        badgeClassName: "bg-slate-50 text-slate-700 ring-slate-200",
        iconClassName: "bg-slate-100 text-slate-700",
      };
    case "writing":
    case "correction":
      return {
        label: type === "correction" ? "Corrección" : "Writing",
        icon: PencilLine,
        badgeClassName: "bg-rose-50 text-rose-700 ring-rose-100",
        iconClassName: "bg-rose-100 text-rose-700",
      };
    case "review":
    case "homework_review":
    case "wrap_up":
      return {
        label:
          type === "homework_review"
            ? "Revisión de deberes"
            : type === "wrap_up"
              ? "Cierre"
              : "Repaso",
        icon: RotateCcw,
        badgeClassName: "bg-cyan-50 text-cyan-700 ring-cyan-100",
        iconClassName: "bg-cyan-100 text-cyan-700",
      };
    case "assessment":
    case "exam_practice":
      return {
        label: type === "exam_practice" ? "Práctica de examen" : "Evaluación",
        icon: ClipboardCheck,
        badgeClassName: "bg-orange-50 text-orange-700 ring-orange-100",
        iconClassName: "bg-orange-100 text-orange-700",
      };
    case "pronunciation":
      return {
        label: "Pronunciación",
        icon: AudioLines,
        badgeClassName: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
        iconClassName: "bg-fuchsia-100 text-fuchsia-700",
      };
    case "game":
      return {
        label: "Juego",
        icon: Gamepad2,
        badgeClassName: "bg-lime-50 text-lime-700 ring-lime-100",
        iconClassName: "bg-lime-100 text-lime-700",
      };
    case "custom":
      return {
        label: "Personalizado",
        icon: Blocks,
        badgeClassName: "bg-gray-100 text-gray-700 ring-gray-200",
        iconClassName: "bg-gray-100 text-gray-600",
      };
    default:
      return {
        label: type ? formatLabel(type) : "Personalizado",
        icon: Blocks,
        badgeClassName: "bg-gray-100 text-gray-700 ring-gray-200",
        iconClassName: "bg-gray-100 text-gray-600",
      };
  }
}
