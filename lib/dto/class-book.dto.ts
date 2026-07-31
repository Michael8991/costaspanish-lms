export interface ClassBookStudentDTO {
  studentId: string;
  name: string;
  attendanceStatus: string | null;
  isTrial: boolean;
}

export interface ClassBookRowDTO {
  id: string;
  lessonId: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  courseId: string | null;
  courseName: string;
  lessonTitle: string;
  status: string;
  preparationStatus: string | null;
  classType: string | null;
  students: ClassBookStudentDTO[];
  studentsLabel: string;
  attendanceSummary: string;
  plannedMinutes: number;
  actualMinutes: number;
  creditsConsumed: number;
  estimatedRevenue: number;
  blocksCount: number;
  completedBlocksCount: number;
  notesPreview: string;
  hasHomework: boolean;
  hasResources: boolean;
  source: "lesson";
}

export interface ClassBookSummaryDTO {
  month: string;
  totalLessons: number;
  scheduledLessons: number;
  completedLessons: number;
  canceledLessons: number;
  inProgressLessons: number;
  totalStudents: number;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  totalCreditsConsumed: number;
  totalEstimatedRevenue: number;
}

export interface ClassBookResponseDTO {
  month: string;
  filters: {
    courseId: string | null;
    studentId: string | null;
    status: string | null;
  };
  summary: ClassBookSummaryDTO;
  rows: ClassBookRowDTO[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
