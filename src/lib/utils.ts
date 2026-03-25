import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { PlanId, Subscription, SubscriptionStatus } from "@/lib/types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfMonthLabel(month: string) {
  const [year, mm] = month.split("-");
  const date = new Date(Number(year), Number(mm) - 1, 1);
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null, style: "long" | "short" = "long") {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function hashPassword(password: string) {
  const salt = randomUUID().replaceAll("-", "");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const hashBuffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  return hashBuffer.length === storedBuffer.length && timingSafeEqual(hashBuffer, storedBuffer);
}

export function addBillingCycle(fromIso: string, plan: PlanId) {
  const date = new Date(fromIso);
  const next = new Date(date);
  next.setMonth(next.getMonth() + (plan === "monthly" ? 1 : 12));
  return next.toISOString();
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getNextDrawLabel(drawDay: number) {
  const now = new Date();
  const upcoming = new Date(now);
  upcoming.setDate(drawDay);
  upcoming.setHours(18, 0, 0, 0);

  if (upcoming < now) {
    upcoming.setMonth(upcoming.getMonth() + 1);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(upcoming);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toNumber(value: FormDataEntryValue | null, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function toStringValue(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function sanitizeScore(value: number) {
  return Math.max(1, Math.min(45, Math.round(value)));
}

export function resolveSubscriptionState(subscription: Subscription): SubscriptionStatus {
  if (!subscription.renewalDate) {
    return "inactive";
  }

  const renewalTime = new Date(subscription.renewalDate).getTime();
  const now = Date.now();

  if ((subscription.status === "cancelled" || subscription.status === "active") && renewalTime < now) {
    return subscription.autoRenew && subscription.status === "active" ? "active" : "lapsed";
  }

  return subscription.status;
}

export function subscriptionHasAccess(subscription: Subscription) {
  const status = resolveSubscriptionState(subscription);

  if (!subscription.renewalDate) {
    return false;
  }

  const renewalTime = new Date(subscription.renewalDate).getTime();
  return (status === "active" || status === "cancelled") && renewalTime >= Date.now();
}
