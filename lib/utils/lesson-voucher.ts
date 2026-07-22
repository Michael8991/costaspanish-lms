export type LessonVoucherPlanInput = {
  _id: string;
  classType?: string;
  status?: string;
  creditsRemaining?: number;
  creditsTotal?: number;
  validUntil?: string | Date | null;
};

export type LessonVoucherStudentInput = {
  activePlans?: LessonVoucherPlanInput[];
};

export type LessonPlanProgressInput = {
  creditsRemaining?: number | null;
  creditsTotal?: number | null;
};

function getExpirationTime(validUntil?: string | Date | null) {
  if (!validUntil) return Number.POSITIVE_INFINITY;

  const expirationTime = new Date(validUntil).getTime();
  return Number.isNaN(expirationTime)
    ? Number.NEGATIVE_INFINITY
    : expirationTime;
}

export function isPlanCompatible(
  plan: LessonVoucherPlanInput,
  classType: string,
  now = new Date(),
) {
  return (
    plan.status === "active" &&
    plan.classType === classType &&
    (plan.creditsRemaining ?? 0) > 0 &&
    getExpirationTime(plan.validUntil) >= now.getTime()
  );
}

export function getCompatiblePlans(
  student: LessonVoucherStudentInput | undefined,
  classType: string,
  now = new Date(),
) {
  return (student?.activePlans ?? []).filter((plan) =>
    isPlanCompatible(plan, classType, now),
  );
}

export function selectBestCompatiblePlan<
  Plan extends LessonVoucherPlanInput,
>(plans: Plan[]): Plan | undefined {
  return plans.reduce<Plan | undefined>((selectedPlan, plan) => {
    if (!selectedPlan) return plan;

    return getExpirationTime(plan.validUntil) <
      getExpirationTime(selectedPlan.validUntil)
      ? plan
      : selectedPlan;
  }, undefined);
}

export function getCurrentLessonNumber(
  plan: LessonPlanProgressInput,
): number | undefined {
  if (
    typeof plan.creditsTotal !== "number" ||
    typeof plan.creditsRemaining !== "number"
  ) {
    return undefined;
  }

  const currentLessonNumber =
    plan.creditsTotal - plan.creditsRemaining + 1;

  if (currentLessonNumber < 1) return 1;
  if (currentLessonNumber > plan.creditsTotal) return plan.creditsTotal;

  return currentLessonNumber;
}

export function formatLessonProgressLabel(plan: LessonPlanProgressInput) {
  const currentLessonNumber = getCurrentLessonNumber(plan);

  if (
    currentLessonNumber !== undefined &&
    typeof plan.creditsTotal === "number"
  ) {
    return `${currentLessonNumber}/${plan.creditsTotal}`;
  }

  if (typeof plan.creditsRemaining === "number") {
    return `${plan.creditsRemaining} restantes`;
  }

  return "Sin bono";
}

export function formatAssignedVoucherLabel(plan: LessonPlanProgressInput) {
  const progressLabel = formatLessonProgressLabel(plan);

  return progressLabel.includes("/") ? `Clase ${progressLabel}` : progressLabel;
}
