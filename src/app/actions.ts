"use server";

import { extname, join } from "node:path";
import { writeFile } from "node:fs/promises";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSessionForUser, destroySession, requireUser } from "@/lib/auth";
import { DRAW_TIER_LABELS } from "@/lib/constants";
import {
  addActivity,
  ensureUploadDirectory,
  readDatabase,
  replaceOrInsertDraft,
  updateDatabase,
  upsertCharity,
} from "@/lib/db";
import { DrawFocus, DrawMode, User } from "@/lib/types";
import {
  addBillingCycle,
  createId,
  hashPassword,
  nowIso,
  sanitizeScore,
  slugify,
  subscriptionHasAccess,
  toNumber,
  toStringValue,
  verifyPassword,
} from "@/lib/utils";

function pushNotification(user: User, type: "system" | "draw" | "winner", title: string, body: string) {
  user.notifications.unshift({
    id: createId("note"),
    type,
    title,
    body,
    createdAt: nowIso(),
    read: false,
  });
  user.notifications = user.notifications.slice(0, 20);
}

function redirectWith(pathname: string, key: "message" | "error", value: string): never {
  redirect(`${pathname}?${key}=${encodeURIComponent(value)}`);
}

export async function signUpAction(formData: FormData) {
  const name = toStringValue(formData.get("name"));
  const email = toStringValue(formData.get("email")).toLowerCase();
  const password = toStringValue(formData.get("password"));
  const country = toStringValue(formData.get("country"), "United States");
  const charityId = toStringValue(formData.get("charityId"));
  const plan = toStringValue(formData.get("plan"), "monthly") as "monthly" | "yearly";
  const bio = "New member ready to track rounds and support a chosen cause.";
  const db = await readDatabase();

  if (!name || !email || !password) {
    redirectWith("/auth/sign-up", "error", "Name, email, and password are required.");
  }

  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    redirectWith("/auth/sign-up", "error", "An account with that email already exists.");
  }

  if (!db.charities.some((charity) => charity.id === charityId)) {
    redirectWith("/auth/sign-up", "error", "Please choose a valid charity.");
  }

  const charityPercentage = Math.max(
    db.config.minimumCharityPercentage,
    Math.min(80, toNumber(formData.get("charityPercentage"), db.config.minimumCharityPercentage)),
  );

  const createdAt = nowIso();
  const userId = await updateDatabase((mutableDb) => {
    const nextUserId = createId("user");

    mutableDb.users.unshift({
      id: nextUserId,
      role: "subscriber",
      name,
      email,
      passwordHash: hashPassword(password),
      country,
      bio,
      createdAt,
      selectedCharityId: charityId,
      charityPercentage,
      subscription: {
        plan,
        status: "active",
        startedAt: createdAt,
        renewalDate: addBillingCycle(createdAt, plan),
        autoRenew: true,
        cancelledAt: null,
        lastPaymentAt: createdAt,
      },
      scores: [],
      notifications: [
        {
          id: createId("note"),
          type: "system",
          title: "Welcome to Golf for Good",
          body: "Your membership is active. Add five Stableford scores to start entering monthly draws.",
          createdAt,
          read: false,
        },
      ],
    });

    addActivity(mutableDb, "subscription", `New ${plan} subscriber created: ${email}.`);
    return nextUserId;
  });

  await createSessionForUser(userId);
  revalidatePath("/");
  revalidatePath("/charities");
  redirectWith("/dashboard", "message", "Your account is live. Add your first rounds to enter the draw.");
}

export async function signInAction(formData: FormData) {
  const email = toStringValue(formData.get("email")).toLowerCase();
  const password = toStringValue(formData.get("password"));
  const db = await readDatabase();
  const user = db.users.find((entry) => entry.email.toLowerCase() === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirectWith("/auth/sign-in", "error", "Invalid email or password.");
  }

  await createSessionForUser(user.id);
  revalidatePath("/");
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

export async function signOutAction() {
  await destroySession();
  revalidatePath("/");
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const currentUser = await requireUser();
  const name = toStringValue(formData.get("name"));
  const country = toStringValue(formData.get("country"));
  const bio = toStringValue(formData.get("bio"));

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);

    if (!user) {
      return;
    }

    user.name = name || user.name;
    user.country = country || user.country;
    user.bio = bio || user.bio;
    addActivity(db, "auth", `Profile updated for ${user.email}.`);
  });

  revalidatePath("/dashboard");
  redirectWith("/dashboard", "message", "Profile updated.");
}

export async function updateSubscriptionAction(formData: FormData) {
  const currentUser = await requireUser();
  const intent = toStringValue(formData.get("intent"));
  const requestedPlan = toStringValue(formData.get("plan"), "monthly") as "monthly" | "yearly";
  const autoRenew = formData.get("autoRenew") === "on";

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);

    if (!user) {
      return;
    }

    const subscription = user.subscription;

    if (intent === "cancel") {
      subscription.status = "cancelled";
      subscription.autoRenew = false;
      subscription.cancelledAt = nowIso();
      pushNotification(
        user,
        "system",
        "Subscription cancelled",
        `Your access remains live until ${subscription.renewalDate?.slice(0, 10) ?? "the current cycle ends"}.`,
      );
      addActivity(db, "subscription", `${user.email} cancelled their subscription.`);
      return;
    }

    if (intent === "reactivate") {
      const now = nowIso();
      subscription.status = "active";
      subscription.plan = requestedPlan;
      subscription.autoRenew = true;
      subscription.cancelledAt = null;
      subscription.startedAt = subscription.startedAt ?? now;
      subscription.renewalDate =
        !subscription.renewalDate || new Date(subscription.renewalDate).getTime() < Date.now()
          ? addBillingCycle(now, requestedPlan)
          : subscription.renewalDate;
      subscription.lastPaymentAt = now;
      pushNotification(user, "system", "Subscription reactivated", "Your dashboard and draw access are fully restored.");
      addActivity(db, "subscription", `${user.email} reactivated a ${requestedPlan} subscription.`);
      return;
    }

    subscription.plan = requestedPlan;
    subscription.autoRenew = autoRenew;

    if (subscription.status === "lapsed" || subscription.status === "inactive") {
      const now = nowIso();
      subscription.status = "active";
      subscription.startedAt = now;
      subscription.renewalDate = addBillingCycle(now, requestedPlan);
      subscription.lastPaymentAt = now;
      subscription.cancelledAt = null;
      addActivity(db, "subscription", `${user.email} restarted access on the ${requestedPlan} plan.`);
      return;
    }

    if (subscription.status === "cancelled" && autoRenew) {
      subscription.status = "active";
      subscription.cancelledAt = null;
    }

    addActivity(db, "subscription", `${user.email} updated subscription preferences.`);
  });

  revalidatePath("/dashboard");
  redirectWith("/dashboard", "message", "Subscription settings updated.");
}

export async function addScoreAction(formData: FormData) {
  const currentUser = await requireUser();
  const scoreValue = sanitizeScore(toNumber(formData.get("value"), 0));
  const playedAt = toStringValue(formData.get("playedAt"));

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);

    if (!user) {
      return;
    }

    if (!subscriptionHasAccess(user.subscription)) {
      redirectWith("/dashboard", "error", "An active subscription is required to enter scores.");
    }

    user.scores.push({
      id: createId("score"),
      value: scoreValue,
      playedAt,
      createdAt: nowIso(),
    });
    user.scores = user.scores
      .sort((a, b) => (a.playedAt < b.playedAt ? 1 : -1))
      .slice(0, 5);

    addActivity(db, "score", `${user.email} recorded a Stableford score of ${scoreValue}.`);
  });

  revalidatePath("/dashboard");
  redirectWith("/dashboard", "message", "Score saved. Your 5-score bank has been refreshed.");
}

export async function updateScoreAction(formData: FormData) {
  const currentUser = await requireUser();
  const scoreId = toStringValue(formData.get("scoreId"));
  const scoreValue = sanitizeScore(toNumber(formData.get("value"), 0));
  const playedAt = toStringValue(formData.get("playedAt"));

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);

    if (!user) {
      return;
    }

    const score = user.scores.find((entry) => entry.id === scoreId);

    if (!score) {
      return;
    }

    score.value = scoreValue;
    score.playedAt = playedAt;
    user.scores = user.scores.sort((a, b) => (a.playedAt < b.playedAt ? 1 : -1)).slice(0, 5);
    addActivity(db, "score", `${user.email} edited a historical score.`);
  });

  revalidatePath("/dashboard");
  redirectWith("/dashboard", "message", "Score updated.");
}

export async function updateCharityPreferenceAction(formData: FormData) {
  const currentUser = await requireUser();
  const charityId = toStringValue(formData.get("charityId"));

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);

    if (!user) {
      return;
    }

    if (!db.charities.some((charity) => charity.id === charityId)) {
      redirectWith("/dashboard", "error", "Please choose a valid charity.");
    }

    user.selectedCharityId = charityId;
    user.charityPercentage = Math.max(
      db.config.minimumCharityPercentage,
      Math.min(80, toNumber(formData.get("charityPercentage"), user.charityPercentage)),
    );
    addActivity(db, "charity", `${user.email} updated charity preferences.`);
  });

  revalidatePath("/dashboard");
  revalidatePath("/charities");
  redirectWith("/dashboard", "message", "Charity preferences updated.");
}

export async function makeIndependentDonationAction(formData: FormData) {
  const currentUser = await requireUser();
  const charityId = toStringValue(formData.get("charityId"));
  const amount = Math.max(10, toNumber(formData.get("amount"), 10));
  const note = toStringValue(formData.get("note"));
  const redirectTo = toStringValue(formData.get("redirectTo"), "/dashboard");

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);

    if (!user || !db.charities.some((charity) => charity.id === charityId)) {
      return;
    }

    db.donations.unshift({
      id: createId("donation"),
      userId: user.id,
      charityId,
      amount,
      note,
      createdAt: nowIso(),
    });
    pushNotification(user, "system", "One-off donation recorded", `An additional ${amount} has been pledged to your selected charity.`);
    addActivity(db, "charity", `${user.email} added a one-off donation.`);
  });

  revalidatePath("/dashboard");
  revalidatePath("/charities");
  redirectWith(redirectTo, "message", "One-off donation recorded.");
}

export async function uploadWinnerProofAction(formData: FormData) {
  const currentUser = await requireUser();
  const drawId = toStringValue(formData.get("drawId"));
  const winnerId = toStringValue(formData.get("winnerId"));
  const proof = formData.get("proof");

  if (!(proof instanceof File) || proof.size === 0) {
    redirectWith("/dashboard", "error", "Please choose an image file before uploading.");
  }

  await ensureUploadDirectory();

  const extension = extname(proof.name) || ".png";
  const fileName = `${slugify(currentUser.name)}-${winnerId}${extension}`;
  const relativePath = `/uploads/${fileName}`;
  await writeFile(join(process.cwd(), "public", "uploads", fileName), Buffer.from(await proof.arrayBuffer()));

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === currentUser.id);
    const draw = db.draws.find((entry) => entry.id === drawId);
    const winner = draw?.winners.find((entry) => entry.id === winnerId && entry.userId === currentUser.id);
    const admin = db.users.find((entry) => entry.role === "admin");

    if (!user || !draw || !winner) {
      return;
    }

    winner.proofStatus = "pending_review";
    winner.proofAsset = relativePath;
    winner.proofSubmittedAt = nowIso();
    pushNotification(
      user,
      "winner",
      "Proof submitted",
      `Your ${DRAW_TIER_LABELS[winner.matchCount]} proof is pending admin review.`,
    );

    if (admin) {
      pushNotification(
        admin,
        "winner",
        "Winner proof pending review",
        `${user.name} uploaded proof for ${draw.month}.`,
      );
    }

    addActivity(db, "winner", `${user.email} uploaded proof for ${draw.month}.`);
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWith("/dashboard", "message", "Proof uploaded and sent for review.");
}

export async function simulateDrawAction(formData: FormData) {
  await requireUser("admin");
  const mode = toStringValue(formData.get("mode"), "random") as DrawMode;
  const focus = toStringValue(formData.get("focus"), "hot") as DrawFocus;
  const notes = toStringValue(formData.get("notes"), "Admin simulation run.");

  await updateDatabase((db) => {
    const draft = replaceOrInsertDraft(db, mode, focus, notes);
    addActivity(db, "draw", `Admin refreshed the ${draft.month} ${mode} simulation.`);
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWith("/admin", "message", "Draft draw updated.");
}

export async function publishDrawAction(formData: FormData) {
  await requireUser("admin");
  const drawId = toStringValue(formData.get("drawId"));

  await updateDatabase((db) => {
    const draw = db.draws.find((entry) => entry.id === drawId && !entry.isPublished);

    if (!draw) {
      redirectWith("/admin", "error", "Draft draw not found.");
    }

    if (db.draws.some((entry) => entry.month === draw.month && entry.isPublished)) {
      redirectWith("/admin", "error", `Results for ${draw.month} are already published.`);
    }

    draw.isPublished = true;
    draw.publishedAt = nowIso();

    for (const participantId of draw.participants) {
      const participant = db.users.find((user) => user.id === participantId);
      if (participant) {
        pushNotification(
          participant,
          "draw",
          "Draw results published",
          `Results for ${draw.month} are live. Open your dashboard to review the numbers.`,
        );
      }
    }

    for (const winner of draw.winners) {
      const user = db.users.find((entry) => entry.id === winner.userId);

      if (user) {
        pushNotification(
          user,
          "winner",
          "You placed in this month’s draw",
          `A ${DRAW_TIER_LABELS[winner.matchCount]} has been logged. Upload proof to continue payout review.`,
        );
      }
    }

    addActivity(db, "draw", `Admin published draw results for ${draw.month}.`);
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWith("/admin", "message", "Draw published and notifications sent.");
}

export async function updateUserFromAdminAction(formData: FormData) {
  await requireUser("admin");
  const userId = toStringValue(formData.get("userId"));

  await updateDatabase((db) => {
    const user = db.users.find((entry) => entry.id === userId);

    if (!user) {
      return;
    }

    user.name = toStringValue(formData.get("name"), user.name);
    user.country = toStringValue(formData.get("country"), user.country);
    user.bio = toStringValue(formData.get("bio"), user.bio);
    user.role = toStringValue(formData.get("role"), user.role) as User["role"];
    user.selectedCharityId = toStringValue(formData.get("charityId"), user.selectedCharityId);
    user.charityPercentage = Math.max(
      db.config.minimumCharityPercentage,
      Math.min(80, toNumber(formData.get("charityPercentage"), user.charityPercentage)),
    );
    user.subscription.plan = toStringValue(formData.get("plan"), user.subscription.plan) as "monthly" | "yearly";
    user.subscription.status = toStringValue(formData.get("status"), user.subscription.status) as User["subscription"]["status"];
    user.subscription.autoRenew = formData.get("autoRenew") === "on";
    user.subscription.renewalDate =
      toStringValue(formData.get("renewalDate")) || user.subscription.renewalDate;

    const scoreIds = formData.getAll("scoreId").map(String);
    const scoreValues = formData.getAll("scoreValue").map((value) => sanitizeScore(Number(value)));
    const scoreDates = formData.getAll("scorePlayedAt").map(String);

    user.scores = scoreIds
      .map((scoreId, index) => {
        const existing = user.scores.find((score) => score.id === scoreId);

        if (!existing) {
          return null;
        }

        return {
          ...existing,
          value: scoreValues[index] ?? existing.value,
          playedAt: scoreDates[index] ?? existing.playedAt,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.playedAt < b!.playedAt ? 1 : -1))
      .slice(0, 5) as User["scores"];

    addActivity(db, "auth", `Admin updated ${user.email}.`);
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectWith("/admin", "message", "User record updated.");
}

export async function saveCharityAction(formData: FormData) {
  await requireUser("admin");

  await updateDatabase((db) => {
    const charity = upsertCharity(db, {
      id: toStringValue(formData.get("id")) || undefined,
      name: toStringValue(formData.get("name"), "Untitled charity"),
      slug: toStringValue(formData.get("slug")) || undefined,
      category: toStringValue(formData.get("category"), "Community"),
      location: toStringValue(formData.get("location"), "Global"),
      summary: toStringValue(formData.get("summary")),
      impactHeadline: toStringValue(formData.get("impactHeadline")),
      description: toStringValue(formData.get("description")),
      image: toStringValue(formData.get("image"), "/charity-ember.svg"),
      featured: formData.get("featured") === "on",
      acceptingNewSupport: formData.get("acceptingNewSupport") === "on",
      tags: toStringValue(formData.get("tags"))
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    addActivity(db, "charity", `Charity saved: ${charity.name}.`);
  });

  revalidatePath("/");
  revalidatePath("/charities");
  revalidatePath("/admin");
  redirectWith("/admin", "message", "Charity saved.");
}

export async function deleteCharityAction(formData: FormData) {
  await requireUser("admin");
  const charityId = toStringValue(formData.get("charityId"));

  await updateDatabase((db) => {
    const charity = db.charities.find((entry) => entry.id === charityId);

    if (!charity) {
      return;
    }

    if (db.users.some((user) => user.selectedCharityId === charityId)) {
      redirectWith("/admin", "error", "Reassign subscribers before deleting this charity.");
    }

    db.charities = db.charities.filter((entry) => entry.id !== charityId);

    if (db.config.featuredCharityId === charityId && db.charities[0]) {
      db.config.featuredCharityId = db.charities[0].id;
      db.charities[0].featured = true;
    }

    addActivity(db, "charity", `Charity deleted: ${charity.name}.`);
  });

  revalidatePath("/");
  revalidatePath("/charities");
  revalidatePath("/admin");
  redirectWith("/admin", "message", "Charity deleted.");
}

export async function reviewWinnerAction(formData: FormData) {
  await requireUser("admin");
  const drawId = toStringValue(formData.get("drawId"));
  const winnerId = toStringValue(formData.get("winnerId"));
  const intent = toStringValue(formData.get("intent"));
  const notes = toStringValue(formData.get("reviewNotes"));

  await updateDatabase((db) => {
    const draw = db.draws.find((entry) => entry.id === drawId);
    const winner = draw?.winners.find((entry) => entry.id === winnerId);
    const user = winner ? db.users.find((entry) => entry.id === winner.userId) : null;

    if (!draw || !winner || !user) {
      return;
    }

    if (intent === "approve") {
      winner.proofStatus = "approved";
      winner.reviewedAt = nowIso();
      winner.reviewNotes = notes || "Proof approved.";
      pushNotification(user, "winner", "Proof approved", `Your ${draw.month} submission is approved and queued for payout.`);
    }

    if (intent === "reject") {
      winner.proofStatus = "rejected";
      winner.reviewedAt = nowIso();
      winner.reviewNotes = notes || "Proof rejected. Please upload clearer evidence.";
      pushNotification(user, "winner", "Proof rejected", winner.reviewNotes);
    }

    if (intent === "mark-paid") {
      winner.payoutStatus = "paid";
      winner.reviewedAt = nowIso();
      winner.reviewNotes = notes || winner.reviewNotes;
      pushNotification(user, "winner", "Payout completed", `Your ${draw.month} prize has been marked paid.`);
    }

    addActivity(db, "winner", `Winner record updated for ${user.email} (${draw.month}).`);
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectWith("/admin", "message", "Winner record updated.");
}
