import type {
  CourseTemplateFrequency,
  TemplateClassType,
} from "@/lib/types/course-policies";
import type {
  PlanPaymentStatus,
  VoucherPaymentMethod,
} from "@/models/StudentProfile";

export type CourseVoucherWarning =
  | "member_paused"
  | "member_left"
  | "no_preferred_weekdays_manual_credits_required"
  | "existing_voucher_for_period"
  | "missing_price"
  | "first_voucher"
  | "renewing_existing_cycle";

export interface CourseVoucherPreviewItemDTO {
  studentId: string;
  studentName: string;
  memberStatus: "active" | "paused" | "left";
  periodStart: string;
  periodEnd: string;
  nextBillingDate: string;
  billingAnchorDay: number;
  classOccurrencesCount: number;
  creditsPerLesson: number;
  creditsTotal: number;
  priceTotal: number;
  unitCreditPrice: number | null;
  paymentStatus: PlanPaymentStatus;
  amountPaid: number;
  paymentMethod: VoucherPaymentMethod;
  paymentNotes: string;
  internalNotes: string;
  warnings: CourseVoucherWarning[];
}

export interface CourseVoucherCourseSummaryDTO {
  courseId: string;
  courseName: string;
  classType: TemplateClassType;
  frequency: CourseTemplateFrequency;
  sessionsPerWeek: number;
  preferredWeekdays: number[];
  creditsPerLesson: number;
}

export interface CourseVoucherPreviewDTO {
  items: CourseVoucherPreviewItemDTO[];
  courseSummary: CourseVoucherCourseSummaryDTO;
}

export interface GeneratedCourseVoucherDTO
  extends CourseVoucherPreviewItemDTO {
  voucherId: string;
  status: "active";
  paidAt: string | null;
}
