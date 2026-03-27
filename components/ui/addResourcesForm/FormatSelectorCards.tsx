import { FormatType } from "@/lib/constants/resource.constants";
import {
  ExternalLink,
  FileAudio,
  FileImage,
  FileText,
  Film,
} from "lucide-react";

export const FORMAT_CARDS: Array<{
  value: FormatType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "pdf",
    title: "PDF",
    description: "Worksheets, readings, grammar sheets o fichas imprimibles.",
    icon: FileText,
  },
  {
    value: "image",
    title: "Imagen",
    description: "Flashcards, infografías, pósters visuales o capturas.",
    icon: FileImage,
  },
  {
    value: "audio",
    title: "Audio",
    description: "Listening tracks, dictados o pronunciación.",
    icon: FileAudio,
  },
  {
    value: "video",
    title: "Vídeo",
    description: "Video clips, explicaciones o tareas audiovisuales.",
    icon: Film,
  },
  {
    value: "external_link",
    title: "Enlace externo",
    description: "YouTube, Drive, article, app o recurso alojado fuera.",
    icon: ExternalLink,
  },
];
