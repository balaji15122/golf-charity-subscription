import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { readDatabase } from "@/lib/db";
import { Session, UserRole } from "@/lib/types";
import { nowIso } from "@/lib/utils";

const SESSION_SECRET = process.env.SESSION_SECRET || "golf-for-good-demo-secret";

interface SessionPayload {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

function signValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signValue(body)}`;
}

function decodeSession(token: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = signValue(body);

  if (expected.length !== signature.length) {
    return null;
  }

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeSession(token);

  if (!payload || new Date(payload.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const db = await readDatabase();
  const user = db.users.find((entry) => entry.id === payload.userId);

  if (!user) {
    return null;
  }

  return {
    session: {
      token,
      userId: payload.userId,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
    } satisfies Session,
    user,
  };
}

export async function getCurrentUser() {
  const current = await getCurrentSession();
  return current?.user ?? null;
}

export async function requireUser(role?: UserRole) {
  const current = await getCurrentSession();

  if (!current) {
    redirect("/auth/sign-in?error=Please sign in to continue.");
  }

  if (role && current.user.role !== role) {
    redirect(current.user.role === "admin" ? "/admin" : "/dashboard");
  }

  return current.user;
}

export async function createSessionForUser(userId: string) {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const token = encodeSession({
    userId,
    createdAt,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
