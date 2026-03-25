import { PlanId } from "@/lib/types";

export const APP_NAME = "Golf for Good";
export const SESSION_COOKIE = "golf-for-good-session";
export const SESSION_DAYS = 7;

export const PLAN_COPY: Record<
  PlanId,
  {
    label: string;
    blurb: string;
  }
> = {
  monthly: {
    label: "Monthly",
    blurb: "Flexible access with monthly prize entry and rolling charity support.",
  },
  yearly: {
    label: "Yearly",
    blurb: "Best value for committed players with discounted billing and ongoing entries.",
  },
};

export const DRAW_TIER_LABELS = {
  5: "5-number match",
  4: "4-number match",
  3: "3-number match",
} as const;

export const DRAW_TIER_PERCENTAGES = {
  5: 0.4,
  4: 0.35,
  3: 0.25,
} as const;

export const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "India",
  "Canada",
  "Australia",
  "Ireland",
  "United Arab Emirates",
  "South Africa",
];
