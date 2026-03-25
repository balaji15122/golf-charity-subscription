import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { addActivity, readDatabase, updateDatabase } from "@/lib/db";
import { Session, UserRole } from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const db = await readDatabase();
  const session = db.sessions.find((entry) => entry.token === token);

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = db.users.find((entry) => entry.id === session.userId);

  if (!user) {
    return null;
  }

  return { session, user };
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
  const token = createId("session");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await updateDatabase((db) => {
    db.sessions = db.sessions.filter((session) => session.userId !== userId);
    db.sessions.push({
      token,
      userId,
      createdAt,
      expiresAt,
    } satisfies Session);

    addActivity(db, "auth", `Session started for ${db.users.find((user) => user.id === userId)?.email ?? userId}.`);
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await updateDatabase((db) => {
      db.sessions = db.sessions.filter((session) => session.token !== token);
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}
