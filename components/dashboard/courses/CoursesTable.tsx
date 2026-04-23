"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreVertical,
  BookOpen,
  Users,
  Archive,
  AlertCircle,
  BrushCleaning,
  LucideIcon,
} from "lucide-react";
import CustomModal from "@/components/ui/CustomModal";
import CourseTemplateTable from "../courseTemplate/CourseTemplateTable";

import { CourseStatuses } from "@/lib/constants/course.constants";
import { CourseTemplateListItemDTO } from "@/lib/dto/course-template.dto";

type CourseType =
  | "regular_group"
  | "intensive_group"
  | "private_flexible"
  | "semi-intensive_group";

type CourseTableItem = {
  id: string;
  code: string;
  internalName: string;
  status: CourseStatuses;
  courseType: CourseType;
  activeEnrollmentCount: number;
  maxStudents?: number;
};
type CourseTemplateTableItem = CourseTemplateListItemDTO;
type QuickOptionsMenu = {
  label: string;
  href?: (id: string) => string;
  icon: LucideIcon;
  danger?: boolean;
};

const quickOptionsMenu: QuickOptionsMenu[] = [
  {
    label: "Editar",
    href: (id) => `/dashboard/courses/${id}/edit`,
    icon: BookOpen,
  },
  {
    label: "Gestionar Alumnos",
    href: (id) => `/dashboard/courses/${id}/students`,
    icon: Users,
  },
  {
    label: "Archivar",
    href: (id) => `/dashboard/courses/${id}/archive`,
    icon: Archive,
    danger: true,
  },
];

function getCourseTypeLabel(courseType: CourseType) {
  switch (courseType) {
    case "regular_group":
      return "Regular";
    case "intensive_group":
      return "Intensive";
    case "semi-intensive_group":
      return "Semi-Intensive";
    case "private_flexible":
      return "Private Flexible";
    default:
      return courseType;
  }
}

function getCourseTypeBadge(courseType: CourseType) {
  switch (courseType) {
    case "regular_group":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "intensive_group":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "semi-intensive_group":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "private_flexible":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function getStatusBadge(status: CourseStatuses) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-green-50 text-green-700 border-green-200",
        dotClassName: "bg-green-500",
      };
    case "paused":
      return {
        label: "Paused",
        className: "bg-gray-100 text-gray-700 border-gray-200",
        dotClassName: "bg-gray-400",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        dotClassName: "bg-amber-500",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-red-50 text-red-700 border-red-200",
        dotClassName: "bg-red-400",
      };
    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-700 border-gray-200",
        dotClassName: "bg-gray-400",
      };
  }
}

function formatOccupation(
  activeEnrollmentCount: number,
  maxStudents?: number,
): string {
  if (typeof maxStudents === "number" && maxStudents > 0) {
    return `${activeEnrollmentCount} / ${maxStudents}`;
  }

  return `${activeEnrollmentCount}`;
}

export default function CoursesTable({ locale }: { locale: string }) {
  const withLocale = (path: string) =>
    `/${locale}${path.startsWith("/") ? path : `/${path}`}`;

  const [courses, setCourses] = useState<CourseTableItem[]>([]);
  const [courseTemplate, setCourseTemplate] = useState<
    CourseTemplateTableItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpenMenu, setIsOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [isCourseTemplateModal, setIsCourseTemplateModal] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/course");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData || "Error al cargar los cursos");
        }
        const data = await response.json();

        setCourses(data.data ?? []);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unexpected error loading courses");
        }
      } finally {
        setIsLoading(false);
      }
    };
    const fetchCoursesTemplate = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/course-template");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData || "Error al cargar los cursos templates");
        }
        const data = await response.json();

        setCourseTemplate(data.data ?? []);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unexpected error loading courses");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
    fetchCoursesTemplate();
  }, []);
  const toggleMenu = (
    courseId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (isOpenMenu === courseId) {
      setIsOpenMenu(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 170;
    const menuWidth = 220;
    const spaceBelow = window.innerHeight - rect.bottom;

    setMenuPosition({
      top:
        spaceBelow > menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4,
      left: rect.right - menuWidth,
    });
    setIsOpenMenu(courseId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (
        !target.closest(".course-menu-button") &&
        !target.closest(".course-menu-dropdown")
      ) {
        setIsOpenMenu(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
        <h2 className="font-semibold text-gray-800 text-lg">Courses</h2>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar curso..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent transition-shadow"
            />
          </div>

          <button
            onClick={() => setIsCourseTemplateModal(true)}
            className="cursor-pointer w-full sm:w-auto bg-[#9e2727] hover:bg-[#a85d5d] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium text-sm"
          >
            <Plus size={18} />
            <span>Nuevo Curso</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-8 text-center text-gray-500">
          <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
          Loading courses...
        </div>
      )}

      {error && (
        <div className="w-full flex items-center justify-center py-4 gap-2 text-red-500">
          <AlertCircle size={16} />
          Error: {error}
        </div>
      )}

      {!isLoading && !error && courses.length <= 0 && (
        <div className="flex items-center justify-center py-5 gap-2 text-green-900">
          No hay cursos registrados
          <BrushCleaning size={16} />
        </div>
      )}
      {!isLoading && !error && courses.length === undefined && (
        <div className="flex items-center justify-center py-5 gap-2 text-green-900">
          No hay cursos registrados
          <BrushCleaning size={16} />
        </div>
      )}

      {!isLoading && !error && courses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Curso</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Ocupación</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => {
                const statusBadge = getStatusBadge(course.status);

                return (
                  <tr
                    key={course.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {course.internalName}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {course.code}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getCourseTypeBadge(course.courseType)}`}
                      >
                        {getCourseTypeLabel(course.courseType)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusBadge.className}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClassName}`}
                        />
                        {statusBadge.label}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-800">
                        {formatOccupation(
                          course.activeEnrollmentCount,
                          course.maxStudents,
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => toggleMenu(course.id, e)}
                        className="course-menu-button p-2 text-gray-400 hover:text-[#9e2727] hover:bg-red-50 rounded-lg transition-colors hover:cursor-pointer"
                        aria-label={`Open actions for ${course.internalName}`}
                      >
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isOpenMenu && menuPosition && (
        <div
          className="course-menu-dropdown fixed z-9999 py-3 px-3 min-w-55 flex flex-col rounded-lg bg-white border border-gray-200 gap-1.5 shadow-xl"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {quickOptionsMenu.map((item, index) => {
            const Icon = item.icon;
            const className = item.danger
              ? "flex items-center py-2 px-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
              : "flex items-center py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200";

            if (!item.href) {
              return (
                <button
                  key={index}
                  type="button"
                  className={className}
                  onClick={() => {
                    setIsOpenMenu(null);
                    setMenuPosition(null);
                  }}
                >
                  <Icon size={18} className="me-2" />
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={index}
                href={withLocale(item.href(isOpenMenu))}
                className={className}
                onClick={() => {
                  setIsOpenMenu(null);
                  setMenuPosition(null);
                }}
              >
                <Icon size={18} className="me-2" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
      <CustomModal
        isOpen={isCourseTemplateModal}
        onClose={() => setIsCourseTemplateModal(false)}
        title="Crear nuevo curso a partir de las plantillas existentes"
        maxWidth="5xl"
      >
        <div className="p-4">
          <CourseTemplateTable
            courseTemplates={courseTemplate}
            locale={locale}
            onClose={() => setIsCourseTemplateModal(false)}
          />
        </div>
      </CustomModal>
    </div>
  );
}
