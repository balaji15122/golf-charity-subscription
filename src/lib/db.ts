import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDrawSimulation, hydrateSubscriptions } from "@/lib/draws";
import { ActivityItem, Charity, Database, DrawFocus, DrawMode, User } from "@/lib/types";
import { createId, getCurrentMonthKey, nowIso, slugify } from "@/lib/utils";

const SEED_DB_PATH = path.join(process.cwd(), "data", "store.json");
const USE_TMP_STORE = Boolean(process.env.VERCEL || process.env.USE_TMP_STORE === "1");
const STORE_DIRECTORY = USE_TMP_STORE ? path.join("/tmp", "golf-for-good") : path.join(process.cwd(), "data");
const DB_PATH = path.join(STORE_DIRECTORY, "store.json");

let writeQueue = Promise.resolve();

async function ensureDatabaseFile() {
  await mkdir(STORE_DIRECTORY, { recursive: true });

  try {
    await access(DB_PATH);
  } catch {
    if (DB_PATH === SEED_DB_PATH) {
      return;
    }

    const seed = await readFile(SEED_DB_PATH, "utf8");
    await writeFile(DB_PATH, seed);
  }
}

async function readRawDatabase() {
  await ensureDatabaseFile();
  const raw = await readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as Database;
}

async function writeRawDatabase(db: Database) {
  await ensureDatabaseFile();
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function readDatabase() {
  const db = await readRawDatabase();
  const changed = hydrateSubscriptions(db);

  if (changed) {
    await writeRawDatabase(db);
  }

  return db;
}

export async function updateDatabase<T>(mutator: (db: Database) => T | Promise<T>) {
  let result: T;

  writeQueue = writeQueue.then(async () => {
    const db = await readDatabase();
    result = await mutator(db);
    await writeRawDatabase(db);
  });

  await writeQueue;

  return result!;
}

export async function getUserByEmail(email: string) {
  const db = await readDatabase();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getUserById(userId: string) {
  const db = await readDatabase();
  return db.users.find((user) => user.id === userId) ?? null;
}

export function findCharity(db: Database, charityId: string) {
  return db.charities.find((charity) => charity.id === charityId) ?? null;
}

export function addActivity(db: Database, type: ActivityItem["type"], summary: string) {
  db.activity.unshift({
    id: createId("activity"),
    type,
    summary,
    createdAt: nowIso(),
  });
  db.activity = db.activity.slice(0, 40);
}

export function findOrCreateCurrentDraw(
  db: Database,
  mode: DrawMode,
  focus: DrawFocus,
  notes: string,
) {
  const month = getCurrentMonthKey();
  const existing = db.draws.find((draw) => draw.month === month && !draw.isPublished);

  if (existing) {
    return existing;
  }

  const draft = createDrawSimulation({
    db,
    month,
    mode,
    focus,
    notes,
  });

  db.draws.unshift(draft);
  return draft;
}

export function replaceOrInsertDraft(db: Database, mode: DrawMode, focus: DrawFocus, notes: string) {
  const month = getCurrentMonthKey();
  const draft = createDrawSimulation({
    db,
    month,
    mode,
    focus,
    notes,
  });

  db.draws = [draft, ...db.draws.filter((draw) => !(draw.month === month && !draw.isPublished))];
  return draft;
}

export function getCurrentDraftDraw(db: Database) {
  const month = getCurrentMonthKey();
  return db.draws.find((draw) => draw.month === month && !draw.isPublished) ?? null;
}

export function getPublishedDraws(db: Database) {
  return db.draws.filter((draw) => draw.isPublished).sort((a, b) => (a.month < b.month ? 1 : -1));
}

export function upsertCharity(db: Database, incoming: Partial<Charity> & Pick<Charity, "name">) {
  const charityId = incoming.id ?? createId("charity");
  const slug = slugify(incoming.slug || incoming.name);
  const current = db.charities.find((charity) => charity.id === charityId);

  const charity: Charity = {
    id: charityId,
    slug,
    name: incoming.name,
    category: incoming.category ?? "Community",
    location: incoming.location ?? "Global",
    summary: incoming.summary ?? "",
    impactHeadline: incoming.impactHeadline ?? "Support through every round.",
    description: incoming.description ?? "",
    image: incoming.image ?? "/charity-ember.svg",
    featured: incoming.featured ?? false,
    acceptingNewSupport: incoming.acceptingNewSupport ?? true,
    upcomingEvents: incoming.upcomingEvents ?? current?.upcomingEvents ?? [],
    tags: incoming.tags ?? current?.tags ?? [],
  };

  db.charities = [charity, ...db.charities.filter((entry) => entry.id !== charityId)];

  if (charity.featured) {
    db.config.featuredCharityId = charity.id;
    db.charities = db.charities.map((entry) =>
      entry.id === charity.id ? entry : { ...entry, featured: false },
    );
  }

  return charity;
}

export function getUserName(users: User[], userId: string) {
  return users.find((user) => user.id === userId)?.name ?? "Unknown member";
}
