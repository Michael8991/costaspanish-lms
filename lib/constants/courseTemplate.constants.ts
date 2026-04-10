export const COURSETEMPLATE_STATUS = ["draft" , "ready" , "archived"] as const;
export type CoourseTemplateStatus = (typeof COURSETEMPLATE_STATUS)[number];

export const STORE_FRONT_PRICE_MODE = ["monthly", "package", "free", "custom_label"] as const ;
export type StoreFrontPriceMode = (typeof STORE_FRONT_PRICE_MODE)[number];

export const CURRENCY_CODES = ["EUR"] as const;
export type CurrencyCodes = (typeof CURRENCY_CODES)[number]

export const PARTICIPANT_MODES = ["solo", "pair", "trio", "group"] as const;
export type ParticipantMode = (typeof PARTICIPANT_MODES) [number]