const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function setTime(date: Date, hours: number, minutes = 0): Date {
  const result = new Date(date);

  result.setHours(hours, minutes, 0, 0);

  return result;
}

const now = new Date();

export const DEMO_SEED_VERSION = 1;

export const demoStudents = [
  {
    seedKey: "student-pierre-demo",
    fullName: "Pierre Demo",
    email: "pierre.demo@example.com",
    level: "A2",
    nativeLanguage: "fr",
  },
  {
    seedKey: "student-sofia-demo",
    fullName: "Sofia Demo",
    email: "sofia.demo@example.com",
    level: "B1",
    nativeLanguage: "en",
  },
  {
    seedKey: "student-daniel-demo",
    fullName: "Daniel Demo",
    email: "daniel.demo@example.com",
    level: "A1",
    nativeLanguage: "de",
  },
] as const;

export const demoVouchers = [
  {
    id: "000000000000000000000101",
    studentSeedKey: "student-pierre-demo",
    name: "Bono demo de 8 clases",
    billingType: "package",
    classType: "private",
    creditsTotal: 8,
    creditsRemaining: 5,
    validFrom: addDays(now, -30),
    validUntil: addDays(now, 60),
    price: 200,
  },
  {
    id: "000000000000000000000102",
    studentSeedKey: "student-sofia-demo",
    name: "Suscripción demo mensual",
    billingType: "subscription",
    classType: "private",
    creditsTotal: 4,
    creditsRemaining: 3,
    validFrom: addDays(now, -15),
    validUntil: addDays(now, 30),
    price: 120,
  },
  {
    id: "000000000000000000000103",
    studentSeedKey: "student-daniel-demo",
    name: "Clase individual demo",
    billingType: "single",
    classType: "private",
    creditsTotal: 1,
    creditsRemaining: 1,
    validFrom: addDays(now, -7),
    validUntil: addDays(now, 30),
    price: 35,
  },
] as const;

export const demoCourseTemplate = {
  seedKey: "course-template-conversation-a2",
  code: "DEMO-CONVERSATION-A2",
  name: "Spanish Conversation A2",
  description:
    "Demo course template for conversational Spanish lessons.",
  version: 1,
  status: "ready",
} as const;

export const demoLessons = [
  {
    seedKey: "lesson-pierre-completed",
    studentSeedKey: "student-pierre-demo",
    title: "Talking about daily routines",
    status: "completed",
    startsAt: setTime(addDays(now, -7), 17),
    durationMinutes: 60,
    isTrial: false,
    voucherId: "000000000000000000000101",
  },
  {
    seedKey: "lesson-pierre-upcoming",
    studentSeedKey: "student-pierre-demo",
    title: "Planning a trip around Spain",
    status: "scheduled",
    startsAt: setTime(addDays(now, 1), 18),
    durationMinutes: 60,
    isTrial: false,
    voucherId: "000000000000000000000101",
  },
  {
    seedKey: "lesson-sofia-upcoming",
    studentSeedKey: "student-sofia-demo",
    title: "Expressing opinions and preferences",
    status: "scheduled",
    startsAt: setTime(addDays(now, 2), 19),
    durationMinutes: 60,
    isTrial: false,
    voucherId: "000000000000000000000102",
  },
  {
    seedKey: "lesson-daniel-trial",
    studentSeedKey: "student-daniel-demo",
    title: "Spanish trial lesson",
    status: "scheduled",
    startsAt: setTime(addDays(now, 4), 16),
    durationMinutes: 45,
    isTrial: true,
    voucherId: null,
  },
  {
    seedKey: "lesson-sofia-cancelled",
    studentSeedKey: "student-sofia-demo",
    title: "Past experiences and travel",
    status: "canceled_by_teacher",
    startsAt: setTime(addDays(now, -3), 19),
    durationMinutes: 60,
    isTrial: false,
    voucherId: "000000000000000000000102",
  },
  {
    seedKey: "lesson-pierre-next-week",
    studentSeedKey: "student-pierre-demo",
    title: "Spanish culture and traditions",
    status: "scheduled",
    startsAt: setTime(addDays(now, 8), 18),
    durationMinutes: 60,
    isTrial: false,
    voucherId: "000000000000000000000101",
  },
] as const;
