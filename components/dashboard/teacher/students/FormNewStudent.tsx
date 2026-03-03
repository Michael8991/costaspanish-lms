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

export default function FormNewStudent({ locale }: { locale: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const goals = formData.getAll("goals");

    const payload = {
      fullName: formData.get("fullName"),
      contactEmail: formData.get("contactEmail"),
      phone: formData.get("phone"),
      country: formData.get("country"),
      nativeLanguage: formData.get("nativeLanguage"),
      timezone: formData.get("timezone"),
      level: formData.get("level"),
      goals: goals,
      internalNotes: formData.get("internalNotes"),
      isActive: formData.get("isActive") === "on",
    };

    const saveStudentPromise = new Promise((resolve, reject) => {
      //TODO: fetch reals
      setTimeout(resolve, 2000);
    });

    toast.promise(saveStudentPromise, {
      loading: "Creating student...",
      success: "Student created successfully!",
      error: "Error creating student. Please try again.",
    });

    try {
      await saveStudentPromise;
      router.push(`/${locale}/dashboard/students`);
    } catch (error: unknown) {
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
              type="text"
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] transition-all"
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Mail size={16} className="text-[#9e2727]" />
              Email Address *
            </label>
            <input
              type="email"
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] transition-all"
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Phone size={16} className="text-[#9e2727]" />
              Phone Number
            </label>
            <input
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
              defaultValue=""
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#9e2727]/50 focus:border-[#9e2727] bg-white transition-all"
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
              <Languages size={16} className="text-[#9e2727]" />
              Native Language
            </label>
            <select
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
              required
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
              required
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
              {GOALS.map((goal) => (
                <label
                  key={goal}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={goal}
                    className="rounded text-[#9e2727] focus:ring-[#9e2727]"
                  />
                  {goal}
                </label>
              ))}
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
          <Switch />{" "}
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
