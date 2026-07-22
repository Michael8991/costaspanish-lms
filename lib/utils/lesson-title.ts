import { formatLessonProgressLabel } from "@/lib/utils/lesson-voucher";

export type LessonTitleAttendeeInput = {
  studentId?: string;
  voucherId?: string;
  isTrial?: boolean;
};

export type LessonTitleStudentInput = {
  _id: string;
  fullName?: string;
  name?: string;
  contactName?: string;
  contactEmail?: string;
  email?: string;
  activePlans?: {
    _id: string;
    classType?: string;
    creditsRemaining?: number;
    creditsTotal?: number;
    status?: string;
    validUntil?: string | Date | null;
  }[];
};

type BuildLessonTitleInput = {
  attendees: LessonTitleAttendeeInput[];
  students: LessonTitleStudentInput[];
  classType?: string;
  courseName?: string;
  scheduledStart?: string | Date | null;
  progressOverride?: {
    currentLessonNumber: number;
    creditsTotal?: number;
  };
};

const classTypeLabels: Record<string, string> = {
  private: "Clase privada",
  pair: "Clase de pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensivo",
  intensive: "Intensivo",
};

const groupClassTypes = new Set([
  "group_regular",
  "semi_intensive",
  "intensive",
]);

function getStudentDisplayName(student?: LessonTitleStudentInput) {
  if (!student) return "Alumno";

  return (
    student.fullName?.trim() ||
    student.contactName?.trim() ||
    student.name?.trim() ||
    student.contactEmail?.trim() ||
    student.email?.trim() ||
    "Alumno"
  );
}

function getClassTypeLabel(classType?: string) {
  if (!classType) return "Selecciona tipo";
  if (classTypeLabels[classType]) return classTypeLabels[classType];

  return classType
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getWeekdayLabel(scheduledStart?: string | Date | null) {
  if (!scheduledStart) return "Día pendiente";

  let date: Date;

  if (
    typeof scheduledStart === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(scheduledStart)
  ) {
    const [datePart] = scheduledStart.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    date = new Date(year, month - 1, day, 12);
  } else {
    date = new Date(scheduledStart);
  }

  if (Number.isNaN(date.getTime())) return "Día pendiente";

  const weekday = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
  }).format(date);

  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function getSelectedPlan(
  attendee: LessonTitleAttendeeInput,
  studentsById: Map<string, LessonTitleStudentInput>,
) {
  if (!attendee.studentId || !attendee.voucherId) return undefined;

  return studentsById
    .get(attendee.studentId)
    ?.activePlans?.find((plan) => plan._id === attendee.voucherId);
}

function getLessonProgressLabel(
  attendee: LessonTitleAttendeeInput,
  studentsById: Map<string, LessonTitleStudentInput>,
) {
  if (attendee.isTrial) return "Trial";

  const plan = getSelectedPlan(attendee, studentsById);
  if (!plan) return "Sin bono";

  return formatLessonProgressLabel(plan);
}

function getAttendeeProgressLabel(
  attendees: LessonTitleAttendeeInput[],
  studentsById: Map<string, LessonTitleStudentInput>,
) {
  if (attendees.length === 0) return "Sin bono";
  if (attendees.length === 1) {
    return getLessonProgressLabel(attendees[0], studentsById);
  }

  const attendeeWithPlan = attendees.find(
    (attendee) => getSelectedPlan(attendee, studentsById) !== undefined,
  );

  if (attendeeWithPlan) {
    return getLessonProgressLabel(attendeeWithPlan, studentsById);
  }

  return attendees.every((attendee) => attendee.isTrial)
    ? "Trial"
    : "Bonos pendientes";
}

function getLessonNamePart(
  attendees: LessonTitleAttendeeInput[],
  studentsById: Map<string, LessonTitleStudentInput>,
) {
  const selectedAttendees = attendees.filter((attendee) => attendee.studentId);

  if (selectedAttendees.length === 0) return "Selecciona alumno";
  if (selectedAttendees.length > 2) {
    return `Grupo de ${selectedAttendees.length} alumnos`;
  }

  return selectedAttendees
    .map((attendee) =>
      getStudentDisplayName(
        attendee.studentId
          ? studentsById.get(attendee.studentId)
          : undefined,
      ),
    )
    .join(" + ");
}

export function buildLessonTitle({
  attendees,
  students,
  classType,
  courseName,
  scheduledStart,
  progressOverride,
}: BuildLessonTitleInput): string {
  const classTypeLabel = getClassTypeLabel(classType);

  if (classType && groupClassTypes.has(classType)) {
    return `${courseName?.trim() || classTypeLabel} - ${getWeekdayLabel(
      scheduledStart,
    )}`;
  }

  const studentsById = new Map(
    students.map((student) => [student._id, student]),
  );
  const namePart = getLessonNamePart(attendees, studentsById);
  const progressPart = progressOverride
    ? progressOverride.creditsTotal === undefined
      ? `Clase ${progressOverride.currentLessonNumber}`
      : `${progressOverride.currentLessonNumber}/${progressOverride.creditsTotal}`
    : getAttendeeProgressLabel(attendees, studentsById);

  return `${namePart} - ${classTypeLabel} - ${progressPart}`;
}
