"use client";

import { Switch } from "@/components/ui/Switch";
import {
  Clock,
  Languages,
  Mail,
  Notebook,
  Phone,
  Target,
  User,
  MapPin,
  GraduationCap,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z, ZodError } from "zod";

const COUNTRIES = [
  "Australia",
  "Brazil",
  "Canada",
  "China",
  "France",
  "Germany",
  "Ireland",
  "Italy",
  "Japan",
  "Mexico",
  "Netherlands",
  "Poland",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
  "United States",
  "Morroco",
  "Other",
];
const LANGUAGES = [
  "English",
  "Mandarin",
  "Japanese",
  "Polish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Korean",
  "Spanish",
  "Arabic",
  "Other",
];
const TIMEZONES = [
  "Europe/Madrid",
  "Europe/Warsaw",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];
const LEVELS = ["Evaluando", "A1", "A2", "B1", "B2", "C1", "C2"];
const GOALS = [
  "Conversation & Fluency",
  "Grammar Mastery",
  "DELE / SIELE Preparation",
  "Business & Work",
  "Spanish for Travel",
  "School / University Support",
  "Relocating to Spain",
  "Pronunciation & Accent",
  "Hobby / Just for fun",
];

function zodIssuesToFieldErrors(issues: ZodError["issues"]) {
  const out: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (!key) continue;
    const field = String(key);

    if (!out[field]) out[field] = issue.message;
  }
  return out;
}

const studentSchema = z.object({
  fullName: z.string().min(3, "Name must be at least 3 characters long"),
  contactEmail: z.email("Email format is invalid"),
  phone: z.string().optional(),
  country: z.string().min(1, "You must select a country"),
  nativeLanguage: z.string().optional(),
  timezone: z.string().min(1, "You must select a time zone"),
  level: z.string().min(1, "You must select a level"),
  goals: z.array(z.string()).min(1, "You must select a goal"),
  internalNotes: z.string().optional(),
  isActive: z.boolean(),
});

export default function FormNewStudent({ locale }: { locale: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const rawPayload = {
      fullName: String(formData.get("fullName") ?? ""),
      contactEmail: formData.get("contactEmail") ?? "",
      phone: String(formData.get("phone") ?? ""),
      country: String(formData.get("country") ?? ""),
      nativeLanguage: String(formData.get("nativeLanguage") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      level: String(formData.get("level") ?? ""),
      goals: formData.getAll("goals").map(String),
      internalNotes: String(formData.get("internalNotes") ?? ""),
      isActive: formData.get("isActive") === "true",
    };

    setFieldErrors({});
    const result = studentSchema.safeParse(rawPayload);
    if (!result.success) {
      const mapped = zodIssuesToFieldErrors(result.error.issues);
      setFieldErrors(mapped);

      toast.error("Please fix the highligted fields");
      setIsSubmitting(false);
      return;
    }
    //Todo: esto es por el fetch de abajo
    const validPlayload = result.data;

    try {
      const saveStudentPromise = new Promise((resolve) => {
        //TODO: fetch reals
        setTimeout(resolve, 2000);
      });

      toast.promise(saveStudentPromise, {
        loading: "Creating student...",
        success: "Student created successfully!",
        error: "Error creating student. Please try again.",
      });

      await saveStudentPromise;
      router.push(`/${locale}/dashboard/students`);
    } catch (error: unknown) {
      toast.error("Error creating student. Please try again.");
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <form
      action=""
      onSubmit={handleSubmit}
      method="post"
      className="flex flex-col gap-8 p-4 max-w-4xl mx-auto text-gray-800"
    >
      {/* SECCIÓN 1: CONTACTO */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <User size={16} className="text-[#9e2727]" />
              Full Name *
            </label>
            <input
              name="fullName"
              type="text"
              className={`border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] transition-all
                ${
                  fieldErrors.fullName
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-gray-300 focus:ring-[#9e2727]/50 focus:border-[#9e2727]"
                }`}
              placeholder="e.g. John Doe"
            />
            {fieldErrors.fullName && (
              <p id="fullName-error" className="text-sm text-red-600 mt-1">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Mail size={16} className="text-[#9e2727]" />
              Email Address *
            </label>
            <input
              name="contactEmail"
              type="email"
              className={`border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.contactEmail
                  ? "border-red-500 focus:ring-red-500/30"
                  : "border-gray-300 focus:ring-[#9e2727]/50 focus:border-[#9e2727]"
              }`}
              placeholder="john@example.com"
              aria-invalid={!!fieldErrors.contactEmail}
            />

            {fieldErrors.contactEmail && (
              <p className="text-sm text-red-600 mt-1">
                {fieldErrors.contactEmail}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Phone size={16} className="text-[#9e2727]" />
              Phone Number
            </label>
            <input
              name="phone"
              type="tel"
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] transition-all"
              placeholder="+34 600 000 000"
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: LOCALIZACIÓN */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">
          Location & Language
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <MapPin size={16} className="text-[#9e2727]" />
              Country
            </label>
            <select
              name="country"
              defaultValue=""
              className={`border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 bg-white transition-all ${
                fieldErrors.country
                  ? "border-red-500 focus:ring-red-500/30"
                  : "border-gray-300 focus:ring-[#9e2727]/50 focus:border-[#9e2727]"
              }`}
            >
              <option value="" disabled>
                Select a country
              </option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {fieldErrors.country && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.country}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Languages size={16} className="text-[#9e2727]" />
              Native Language
            </label>
            <select
              name="nativeLanguage"
              defaultValue=""
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] bg-white transition-all"
            >
              <option value="" disabled>
                Select a language
              </option>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Clock size={16} className="text-[#9e2727]" />
              Time Zone *
            </label>
            <select
              name="timezone"
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] bg-white transition-all"
            >
              <option value="Europe/Madrid">Europe/Madrid (Default)</option>
              {TIMEZONES.filter((tz) => tz !== "Europe/Madrid").map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: ACADÉMICA */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">
          Academic Profile
        </h2>

        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col gap-1.5 md:w-1/2">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <GraduationCap size={16} className="text-[#9e2727]" />
              Spanish Level *
            </label>
            <select
              name="level"
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] bg-white transition-all"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Target size={16} className="text-[#9e2727]" />
              Learning Goals
              <span className="text-xs italic text-gray-400 font-normal">
                (Select multiple)
              </span>
            </label>
            <div
              className={`grid grid-cols-2 md:grid-cols-3 gap-3 mt-1
              ${
                fieldErrors.goals
                  ? " border rounded-lg p-2 border-red-500 focus:ring-red-500/30"
                  : "border-gray-300 focus:ring-[#9e2727]/50 focus:border-[#9e2727]"
              }`}
            >
              {GOALS.map((goal, idx) => (
                <label
                  key={goal}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:cursor-pointer"
                >
                  <input
                    id={`goal-${idx}`}
                    name="goals"
                    type="checkbox"
                    value={goal}
                    className="rounded text-[#9e2727] focus:ring-[#9e2727]"
                  />
                  {goal}
                </label>
              ))}
              {fieldErrors.goals && (
                <p className="text-sm text-red-600 mt-2">{fieldErrors.goals}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="flex justify-between items-center text-sm font-medium text-gray-700">
              <div className="flex gap-2 items-center">
                <Notebook size={16} className="text-[#9e2727]" />
                Internal Notes
              </div>
              <span className="text-xs italic text-gray-400 font-normal">
                Private (Only teachers)
              </span>
            </label>
            <textarea
              name="internalNotes"
              className="border border-gray-300 rounded-lg px-4 py-3 min-h-25 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] transition-all resize-y"
              placeholder="Add any specific details about the student's learning style, preferences, etc."
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN 4: ESTADO Y BOTONES */}
      <section className="flex flex-col sm:flex-row items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3 w-full sm:w-auto mb-4 sm:mb-0">
          <label className="text-sm font-semibold text-gray-700 cursor-pointer">
            Set as Active Student
          </label>
          <Switch name="isActive" value="true" defaultChecked />{" "}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Link
            href="/en/dashboard/students"
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            disabled={isSubmitting}
            type="submit"
            className={`px-5 py-2.5 text-sm font-medium text-white bg-[#9e2727] rounded-lg hover:bg-[#8a2222] shadow-sm transition-colors hover:cursor-pointer flex items-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Student"
            )}
          </button>
        </div>
      </section>
    </form>
  );
}
