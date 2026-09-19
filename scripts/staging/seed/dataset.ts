import { Types } from "mongoose";
import { StudentProfile, type PlanDoc } from "../../../models/StudentProfile";
import { CourseTemplate } from "../../../models/CourseTemplate";
import { CourseProfile } from "../../../models/CourseProfile";
import { CourseEnrollment } from "../../../models/CourseEnrollment";
import { Resource } from "../../../models/ResourceProfile";
import { PaymentLedgerEntry } from "../../../models/PaymentLedgerEntry";
import { CreditLedgerEntry } from "../../../models/CreditLedgerEntry";
import Lesson from "../../../models/Lesson";
import { DEFAULT_OPERATIONAL_DEFAULTS } from "../../../lib/constants/courseTemplate.constants";
import { calculateCreditsForAttendee } from "../../../lib/utils/lesson-credit-policy";
import type { LessonAttendanceStatus } from "../../../lib/types/lesson";
import { fromCents } from "../../../lib/utils/money";
import { courses, emailFor, resources, students, vouchers } from "./catalog";
import { atUtcHour, monthPeriod, SEED_NAME, seedId, shiftDays, utcDay } from "./identity";

export function buildDataset(teacherId: Types.ObjectId, referenceDate = new Date()) {
  const anchor = utcDay(referenceDate);
  const studentDocs = students.map(([fullName, key, level, nativeLanguage], index) => new StudentProfile({
    _id: seedId("student", index), teacherId, fullName,
    contactEmail: emailFor(key), contactEmailLower: emailFor(key),
    level, nativeLanguage, timezone: "Europe/Madrid", isActive: true,
    goals: ["Comunicar con confianza", "Practicar en situaciones reales"],
    internalNotes: SEED_NAME, activePlans: [],
  }));
  const resourceDocs = resources.map(([title, level, pedagogicalType, skill], index) => new Resource({
    _id: seedId("resource", index), ownerTeacherId: teacherId, title,
    description: `Material demo para practicar ${title.toLowerCase()}.`,
    status: index === 12 ? "draft" : "published", visibility: "private",
    format: "external_link", externalUrl: `https://example.com/costaspanish/${level.toLowerCase()}/actividad-${index + 1}`,
    pedagogicalType, levels: [level], skills: [skill],
    deliveryModes: index % 2 ? ["homework"] : ["classwork", "homework"],
    lessonStages: index % 2 ? ["input", "guided_practice"] : ["warmup", "freer_practice"],
    tags: [SEED_NAME, level.toLowerCase()], estimatedDurationMinutes: 15,
    difficulty: index % 3 + 1, requiresTeacherReview: skill === "writing", timesUsed: 0,
  }));

  function policies(index: number) {
    const course = courses[index];
    return {
      ...DEFAULT_OPERATIONAL_DEFAULTS,
      lessonDefaults: { durationMinutes: index === 2 ? 180 : 60, timezone: "Europe/Madrid", defaultClassType: course.classType },
      schedulingDefaults: { frequency: index === 2 ? "custom" as const : "weekly" as const,
        sessionsPerWeek: index === 2 ? 5 : 1, preferredWeekdays: index === 2 ? [1, 2, 3, 4, 5] : [2], allowRecurringLessons: true },
      participantPolicy: { participantMode: index >= 3 ? "solo" as const : "group" as const, minStudents: 1, maxStudents: course.capacity },
    };
  }
  function storefront(index: number) {
    const isPrivate = index >= 3;
    return {
      isPublished: false, publicTitle: isPrivate ? "Privadas flexibles 1:1" : courses[index].name,
      shortDescription: isPrivate ? "Sesiones individuales adaptadas a tus objetivos." : courses[index].name,
      benefits: ["Práctica comunicativa", "Seguimiento individual"], currency: "EUR" as const,
      priceMode: index < 2 ? "monthly" as const : "package" as const,
      priceOptions: (index < 2 ? [["Mensualidad", 80, 4]] : index === 2
        ? [["Una semana · 15 horas", 175, 5], ["Cuatro semanas · 60 horas", 630, 20]]
        : [["Suelta", 25, 1], ["Bono 4", 85, 4], ["Bono 8", 160, 8], ["Bono 12", 220, 12]])
        .map(([label, amount, count], order) => ({ label: String(label), amount: Number(amount), isActive: true,
          sortOrder: order, condition: { participantMode: isPrivate ? "solo" as const : "group" as const,
            ...(index < 2 ? { monthlyClasses: Number(count) } : { packageClasses: Number(count) }) } })),
    };
  }
  const templateDocs = [0, 1, 2, 3].map(index => {
    const resourceIndexes = index === 0 ? [0, 1, 2, 3] : index === 1 ? [4, 5, 6] : index === 2 ? [7, 8, 9] : [4, 6];
    return new CourseTemplate({
      _id: seedId("template", index), ownerTeacherId: teacherId,
      code: `DEMO2-TEMPLATE-${index}`, internalName: index === 3 ? "Privadas flexibles" : courses[index].name,
      status: "ready", version: 1,
      pedagogicalMeta: { level: courses[index].level, category: "Comunicación",
        objectives: ["Comprender mensajes cotidianos", "Expresar ideas con autonomía"], methodology: "Aprendizaje comunicativo" },
      storefront: storefront(index), operationalDefaults: policies(index),
      curriculum: { modules: [0, 1].map(moduleIndex => ({
        title: moduleIndex === 0 ? "Descubrir y practicar" : "Comunicar y consolidar", order: moduleIndex,
        lessons: [0, 1].map(lessonIndex => ({
          title: `Sesión ${moduleIndex * 2 + lessonIndex + 1}`, order: lessonIndex, estimatedMinutes: index === 2 ? 180 : 60,
          objectives: ["Aplicar lo aprendido en una conversación"],
          blocks: [0, 1].map(blockIndex => ({
            title: blockIndex ? "Conversación guiada" : "Preparación y comprensión", order: blockIndex,
            type: blockIndex ? "speaking" : "reading", categories: [blockIndex ? "speaking" : "reading"],
            plannedContent: "Leer el recurso y practicar con ejemplos personales.", plannedObjectives: ["Usar vocabulario en contexto"],
            estimatedMinutes: index === 2 ? 90 : 30, cefrLevels: [courses[index].level], skills: [blockIndex ? "speaking" : "reading"],
            resources: [seedId("resource", resourceIndexes[(moduleIndex + lessonIndex + blockIndex) % resourceIndexes.length])],
          })),
        })),
      })) },
    });
  });
  const enrollmentDocs = courses.flatMap((course, courseIndex) => course.members.map(studentIndex => new CourseEnrollment({
    _id: seedId("enrollment", courseIndex * 100 + studentIndex), courseId: seedId("course", courseIndex),
    studentId: seedId("student", studentIndex), status: "active", enrolledAt: shiftDays(anchor, -60),
  })));
  const plans: PlanDoc[] = vouchers.map((definition, index) => {
    const paid = definition.payments.reduce((sum: number, amount: number) => sum + amount, 0);
    const start = definition.period === "future" ? monthPeriod(anchor, 1).start
      : shiftDays(anchor, definition.course < 2 && definition.period === "current" ? -20 : definition.course === 2 ? -4 : -35);
    const end = definition.period === "future" ? monthPeriod(anchor, 1).end
      : definition.period === "last_day" ? anchor : definition.period === "exhausted" ? shiftDays(anchor, -1)
      : shiftDays(anchor, definition.course < 2 ? 8 : index === 8 ? 2 : 30);
    return {
      _id: seedId("voucher", index), name: `${courses[definition.course].name} · ${definition.credits} clases`,
      enrollmentId: seedId("enrollment", definition.course * 100 + definition.student),
      courseId: seedId("course", definition.course), courseNameSnapshot: courses[definition.course].name,
      billingType: definition.course < 2 ? "subscription" : "package", classType: courses[definition.course].classType,
      creditsTotal: definition.credits, creditsRemaining: definition.credits, validFrom: start, validUntil: end,
      billingPeriodStart: start, billingPeriodEnd: end, billingMode: "individual_cycle", billingAnchorDay: start.getUTCDate(),
      status: "active", priceTotalCents: definition.cents, amountPaidCents: paid,
      price: fromCents(definition.cents), priceTotal: fromCents(definition.cents), amountPaid: fromCents(paid),
      paymentStatus: paid === 0 ? "pending" : paid === definition.cents ? "paid" : "partial",
      paidAt: paid ? atUtcHour(shiftDays(start, definition.payments.length - 1), 9) : null,
      paymentMethod: paid ? (["bank_transfer", "card", "bizum", "cash"] as const)[index % 4] : "",
      currency: "EUR", unitCreditPriceSnapshot: fromCents(definition.cents) / definition.credits,
      createdFrom: "course_profile", generatedFromCourse: true, generatedFromCourseMember: true, internalNotes: SEED_NAME,
    };
  });
  const paymentDocs = vouchers.flatMap((definition, index) => definition.payments.map((amountCents, paymentIndex) => {
    const plan = plans[index];
    const runningPaid = definition.payments.slice(0, paymentIndex + 1).reduce((sum: number, amount: number) => sum + amount, 0);
    return new PaymentLedgerEntry({
      _id: seedId("payment", index * 100 + paymentIndex), teacherId, studentId: seedId("student", definition.student),
      studentNameSnapshot: students[definition.student][0], voucherId: plan._id, voucherNameSnapshot: plan.name,
      courseId: plan.courseId, courseNameSnapshot: plan.courseNameSnapshot,
      billingPeriodStart: plan.billingPeriodStart, billingPeriodEnd: plan.billingPeriodEnd,
      amountCents, amount: fromCents(amountCents), currency: "EUR", status: "active",
      paymentStatusSnapshot: runningPaid === definition.cents ? "paid" : "partial",
      paidAt: atUtcHour(shiftDays(plan.validFrom, paymentIndex), 9), paymentMethod: plan.paymentMethod,
      source: "voucher_payment_registered", createdBy: teacherId, notes: SEED_NAME,
      idempotencyKey: `c05a2026-0000-4000-8000-${(index * 100 + paymentIndex).toString(16).padStart(12, "0")}`,
    });
  }));

  type LessonSpec = { course?: number; offset: number; plans: number[]; status?: "completed" | "scheduled" | "canceled_by_teacher";
    attendance?: LessonAttendanceStatus[]; trial?: boolean };
  const specs: LessonSpec[] = [
    ...[-28, -21, -14, -7].map((offset, index) => ({ course: 0, offset, plans: index < 2 ? [6] : [6, 1] })),
    { course: 0, offset: 7, plans: [1, 5] },
    { course: 1, offset: -10, plans: [0, 4], attendance: ["attended", "canceled_early"] },
    { course: 1, offset: -3, plans: [0, 4] }, { course: 1, offset: 0, plans: [4], status: "scheduled" },
    { course: 1, offset: 4, plans: [0] },
    ...[-20, -18, -16, -14, -12, -10, -8].map(offset => ({ course: 3, offset, plans: [2] })),
    { course: 3, offset: 2, plans: [2] },
    { course: 4, offset: -6, plans: [3], attendance: ["no_show"] },
    { course: 4, offset: 5, plans: [3] }, { course: 4, offset: -2, plans: [3], status: "canceled_by_teacher" },
    { course: 2, offset: -4, plans: [8, 9] },
    { course: 2, offset: -2, plans: [8, 9], attendance: ["attended", "canceled_late"] },
    { course: 2, offset: 1, plans: [8, 9] },
    { offset: -1, plans: [], trial: true }, { offset: 3, plans: [], trial: true },
  ];
  const creditDocs: InstanceType<typeof CreditLedgerEntry>[] = [];
  const dailySlots = new Map<number, number>();
  // Settle in chronological order so before/after snapshots are meaningful.
  const lessonDocs = specs.map((spec, index) => ({ spec, index })).sort((a, b) => a.spec.offset - b.spec.offset || a.index - b.index)
    .map(({ spec, index }) => {
      const courseIndex = spec.course ?? 3;
      const policy = policies(courseIndex);
      const status = spec.status ?? (spec.offset < 0 ? "completed" : "scheduled");
      const slot = dailySlots.get(spec.offset) ?? 0;
      dailySlots.set(spec.offset, slot + 1);
      const start = atUtcHour(shiftDays(anchor, spec.offset), 8 + slot * 4);
      const end = new Date(start.getTime() + policy.lessonDefaults.durationMinutes * 60000);
      const attendees = spec.trial ? [{ studentId: seedId("student", 9), isTrial: true, creditsToConsume: 0,
        attendanceStatus: status === "completed" ? "attended" as const : "pending" as const }]
        : spec.plans.map((planIndex, attendeeIndex) => ({
          studentId: seedId("student", vouchers[planIndex].student), voucherId: plans[planIndex]._id,
          isTrial: false, creditsToConsume: 1,
          attendanceStatus: spec.attendance?.[attendeeIndex] ?? (status === "completed" ? "attended" as const : "pending" as const),
        }));
      const title = spec.trial ? "Clase de prueba · Hannah" : `${courses[courseIndex].name} · sesión ${index + 1}`;
      const items = status !== "completed" ? [] : attendees.map((attendee, attendeeIndex) => {
        const calculation = calculateCreditsForAttendee({ attendee, policy: { ...policy.creditPolicy, mode: "course" } });
        const plan = spec.trial ? undefined : plans[spec.plans[attendeeIndex]];
        const previous = plan?.creditsRemaining ?? null;
        if (plan) plan.creditsRemaining = plan.creditsRemaining! - calculation.creditsConsumed;
        if (plan && calculation.creditsConsumed > 0) creditDocs.push(new CreditLedgerEntry({
          _id: seedId("credit", index * 100 + attendeeIndex), teacherId, lessonId: seedId("lesson", index),
          lessonTitleSnapshot: title, lessonDate: start, consumedAt: end,
          courseId: plan.courseId, courseNameSnapshot: plan.courseNameSnapshot,
          studentId: attendee.studentId, studentNameSnapshot: students[vouchers[spec.plans[attendeeIndex]].student][0],
          voucherId: plan._id, voucherNameSnapshot: plan.name, billingPeriodStart: plan.billingPeriodStart, billingPeriodEnd: plan.billingPeriodEnd,
          creditsConsumed: calculation.creditsConsumed, voucherTotalCreditsSnapshot: plan.creditsTotal,
          voucherPriceSnapshot: plan.priceTotal, unitCreditPriceSnapshot: plan.unitCreditPriceSnapshot,
          estimatedRevenue: Math.round(calculation.creditsConsumed * plan.unitCreditPriceSnapshot! * 100) / 100,
          source: "lesson_completion", status: "active", settlementReason: calculation.reason, notes: SEED_NAME,
        }));
        return { ...attendee, ...calculation, voucherId: plan?._id ?? null,
          previousCreditsRemaining: previous, newCreditsRemaining: plan?.creditsRemaining ?? null };
      });
      const resourceIndex = courseIndex === 0 ? index % 4 : courseIndex === 2 ? 7 + index % 3 : 4 + index % 3;
      resourceDocs[resourceIndex].timesUsed += 1;
      return new Lesson({
        _id: seedId("lesson", index), teacherId, title, status, scheduledStart: start, scheduledEnd: end,
        ...(spec.course !== undefined ? { courseId: seedId("course", spec.course), courseTemplateId: seedId("template", courses[courseIndex].template),
          courseTemplateVersion: 1, courseLink: { relationType: "course_free_lesson", linkedAt: shiftDays(anchor, -60), linkedBy: teacherId } } : {}),
        timezone: "Europe/Madrid", classType: courses[courseIndex].classType, isTrial: Boolean(spec.trial),
        preparationStatus: index % 5 === 0 && status === "scheduled" ? "needs_preparation" : "prepared",
        policySnapshot: { lessonDefaults: policy.lessonDefaults, creditPolicy: policy.creditPolicy, preparationPolicy: policy.preparationPolicy },
        attendees, creationSource: "manual", teacherNotes: SEED_NAME,
        blocks: [{ _id: seedId("block", index), title: resourceDocs[resourceIndex].title, type: "speaking", order: 0,
          plannedContent: "Leer el material, comentar las ideas y practicar un diálogo.",
          cefrLevels: [spec.trial ? "B2" : courses[courseIndex].level], skills: ["speaking"], resources: [resourceDocs[resourceIndex]._id],
          completionStatus: status === "completed" ? "completed" : "not_completed" }],
        ...(status === "completed" ? { creditSettlement: {
          status: "settled", source: "course_policy", policySource: "lesson_snapshot", consumeOn: "completion",
          settledAt: end, settledBy: teacherId, items, totalCreditsConsumed: items.reduce((sum, item) => sum + item.creditsConsumed, 0), warnings: [],
        } } : {}),
      });
    });
  plans.forEach((plan, index) => {
    if (plan.creditsRemaining === 0) plan.status = "exhausted";
    else if (plan.validUntil < anchor) plan.status = "expired";
    studentDocs[vouchers[index].student].activePlans.push(plan);
  });
  const courseDocs = courses.map((course, index) => new CourseProfile({
    _id: seedId("course", index), ownerTeacherId: teacherId, teacherId,
    templateId: seedId("template", course.template), templateVersion: 1, code: course.code,
    templateSnapshot: {
      templateId: String(seedId("template", course.template)), code: templateDocs[course.template].code,
      internalName: templateDocs[course.template].internalName, version: 1,
      level: templateDocs[course.template].pedagogicalMeta.level,
      category: templateDocs[course.template].pedagogicalMeta.category,
      curriculumStats: {
        modulesCount: templateDocs[course.template].curriculum.modules.length,
        lessonsCount: templateDocs[course.template].curriculum.modules.reduce((sum: number, module: { lessons: unknown[] }) => sum + module.lessons.length, 0),
        blocksCount: templateDocs[course.template].curriculum.modules.reduce((sum: number, module: { lessons: { blocks: unknown[] }[] }) =>
          sum + module.lessons.reduce((count, lesson) => count + lesson.blocks.length, 0), 0),
        resourcesCount: new Set(templateDocs[course.template].curriculum.modules.flatMap((module: { lessons: { blocks: { resources: Types.ObjectId[] }[] }[] }) =>
          module.lessons.flatMap(lesson => lesson.blocks.flatMap(block => block.resources.map(String))))).size,
      },
    },
    internalName: course.name, name: course.name, status: "active", visibility: "private",
    courseType: course.type, classType: course.classType, startDate: shiftDays(anchor, -60),
    scheduleNotes: index === 2 ? "Online · lunes a viernes · 3 horas/día (15 horas/semana)" : index < 2 ? "Presencial · sesión semanal" : "Horario individual flexible",
    internalNotes: SEED_NAME, policies: policies(index), storefront: { ...storefront(index), slug: course.code.toLowerCase() },
    publicationMeta: { enrollmentOpen: true, maxStudents: course.capacity },
    regularPolicy: index < 3 ? { billingModel: "monthly", voucherGenerationMode: "monthly_from_schedule", issueDayOfMonth: 1,
      voucherStatusOnIssue: "pending_payment", timezone: "Europe/Madrid",
      weeklySlots: (index === 2 ? [1, 2, 3, 4, 5] : [2]).map(dayOfWeek => ({ dayOfWeek, startTime: "10:00", durationMinutes: index === 2 ? 180 : 60, creditsPerOccurrence: 1 })) } : undefined,
    privateFlexiblePolicy: index >= 3 ? { billingModel: "package", voucherGenerationMode: "manual_pack", allowAdditionalStudentsLater: false, maxStudents: 1, defaultPackCredits: 8 } : undefined,
    studentIds: course.members.map(studentIndex => seedId("student", studentIndex)),
    members: course.members.map(studentIndex => {
      const memberPlans = plans.filter(plan => plan.courseId!.equals(seedId("course", index)) && studentDocs[studentIndex].activePlans.some(p => p._id.equals(plan._id)))
        .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
      return { studentId: seedId("student", studentIndex), status: "active", joinedAt: shiftDays(anchor, -60),
        billing: { mode: "individual_cycle", billingAnchorDay: memberPlans[0].validFrom.getUTCDate(), billingStartedAt: memberPlans[0].validFrom,
          nextBillingDate: shiftDays(memberPlans.at(-1)!.validUntil, 1), firstVoucherId: memberPlans[0]._id, lastVoucherId: memberPlans.at(-1)!._id } };
    }),
    consumptionPolicies: { attendance: { outcome: "consume", creditsToConsume: 1 }, noShow: { outcome: "consume", creditsToConsume: 1 },
      teacherCancellation: { outcome: "reschedule", creditsToConsume: 0 }, studentCancellationRules: [{ outcome: "do_not_consume", creditsToConsume: 0 }] },
    stats: { activeEnrollmentCount: course.members.length, lessonCount: lessonDocs.filter(lesson => lesson.courseId?.equals(seedId("course", index))).length },
    progress: { currentModuleOrder: 0, currentLessonOrder: 0,
      completedLessonsCount: lessonDocs.filter(lesson => lesson.courseId?.equals(seedId("course", index)) && lesson.status === "completed").length },
  }));
  return { anchor, students: studentDocs, templates: templateDocs, courses: courseDocs, enrollments: enrollmentDocs,
    resources: resourceDocs, payments: paymentDocs, lessons: lessonDocs, credits: creditDocs };
}

export type SeedDataset = ReturnType<typeof buildDataset>;
