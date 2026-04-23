
export const COURSE_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type CourseStatuses = (typeof COURSE_STATUSES)[number]
export const COURSE_VISIBILITIES = ["private", "unlisted", "public"] as const;
export type CourseVisibilityes = (typeof COURSE_STATUSES)[number]
export const COURSE_TYPES = ["regular_group", "intensive_group", "private_flexible", "semi-intensive_group"] as const;
export type CoursesTypes = (typeof COURSE_TYPES)[number]
export const STOREFRONT_PRICE_MODES = ["monthly", "package", "free", "custom_label"] as const;
export type StorefrontPricesModes = (typeof STOREFRONT_PRICE_MODES)[number]
export const CURRENCY_CODES = ["EUR"] as const;
export type CurrencyCodes = (typeof CURRENCY_CODES)[number]
export const CONSUMPTION_OUTCOMES = ["consume", "do_not_consume", "reschedule"] as const;
export type ConsumptionOutcomes = (typeof CONSUMPTION_OUTCOMES)[number]
export const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 7] as const;
export type DaysOfWeek = (typeof DAYS_OF_WEEK)[number]