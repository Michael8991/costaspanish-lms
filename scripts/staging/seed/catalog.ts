import type { AcademicLevel } from "../../../models/StudentProfile";
import type { CEFRLevel, PedagogicalType, SkillFocus } from "../../../models/ResourceProfile";

export const students = [
  ["Sofia Demo", "sofia", "A2", "en"],
  ["Daniel Demo", "daniel", "A1", "de"],
  ["Pierre Demo", "pierre", "A2", "fr"],
  ["Claire Demo", "claire", "B1", "fr"],
  ["Natalia Demo", "natalia", "A2", "pl"],
  ["Jorge Pruebas", "jorge", "A1", "en"],
  ["Alex Demo", "alex", "A1", "en"],
  ["Emma Demo", "emma", "B1", "en"],
  ["Luca Demo", "luca", "B1", "it"],
  ["Hannah Demo", "hannah", "B2", "de"],
] satisfies [string, string, AcademicLevel, string][];

// New namespace: older demo/student records are deliberately not adopted by email.
export const emailFor = (key: string) => `${key}.lms-demo@example.test`;

export const resources = [
  ["Saludos y presentaciones", "A1", "speaking_prompt", "speaking"],
  ["Ser y estar: primeros pasos", "A1", "grammar_reference", "grammar"],
  ["Números y fechas", "A1", "quiz", "vocabulary"],
  ["La vida cotidiana", "A1", "flashcards", "vocabulary"],
  ["Contar experiencias pasadas", "A2", "worksheet", "grammar"],
  ["Rutinas y hábitos", "A2", "reading_text", "reading"],
  ["Conversación en la ciudad", "A2", "speaking_prompt", "speaking"],
  ["Conectores para argumentar", "B1", "grammar_reference", "grammar"],
  ["Expresión oral: resolver problemas", "B1", "speaking_prompt", "speaking"],
  ["Comprensión y preparación DELE", "B1", "reading_text", "reading"],
  ["Debate: turismo sostenible", "B2", "speaking_prompt", "speaking"],
  ["Expresiones idiomáticas", "B2", "quiz", "vocabulary"],
  ["Comprensión avanzada y opinión", "B2", "writing_prompt", "writing"],
] satisfies [string, CEFRLevel, PedagogicalType, SkillFocus][];

export const courses = [
  { name: "Grupo regular A1 presencial", code: "DEMO2-A1", level: "A1", type: "regular_group", classType: "group_regular", members: [1, 5, 6], capacity: 6, template: 0 },
  { name: "Grupo regular A2 presencial", code: "DEMO2-A2", level: "A2", type: "regular_group", classType: "group_regular", members: [0, 4], capacity: 6, template: 1 },
  { name: "Intensivo B1 online", code: "DEMO2-B1", level: "B1", type: "intensive_group", classType: "intensive", members: [7, 8], capacity: 6, template: 2 },
  { name: "Privadas flexibles · Pierre", code: "DEMO2-PRIVATE-PIERRE", level: "A2", type: "private_flexible", classType: "private", members: [2], capacity: 1, template: 3 },
  { name: "Privadas flexibles · Claire", code: "DEMO2-PRIVATE-CLAIRE", level: "B1", type: "private_flexible", classType: "private", members: [3], capacity: 1, template: 3 },
] as const;

// student, course, credits, canonical price, canonical payment movements, period.
export const vouchers = [
  { student: 0, course: 1, credits: 4, cents: 8000, payments: [8000], period: "current" },
  { student: 1, course: 0, credits: 4, cents: 8000, payments: [8000], period: "current" },
  { student: 2, course: 3, credits: 8, cents: 16000, payments: [8000, 8000], period: "current" },
  { student: 3, course: 4, credits: 12, cents: 22000, payments: [10000, 5000], period: "current" },
  { student: 4, course: 1, credits: 4, cents: 8000, payments: [8000], period: "last_day" },
  { student: 5, course: 0, credits: 4, cents: 8000, payments: [], period: "current" },
  { student: 6, course: 0, credits: 4, cents: 8000, payments: [8000], period: "exhausted" },
  { student: 6, course: 0, credits: 4, cents: 8000, payments: [], period: "future" },
  { student: 7, course: 2, credits: 5, cents: 17500, payments: [17500], period: "current" },
  { student: 8, course: 2, credits: 20, cents: 63000, payments: [63000], period: "current" },
] as const;
