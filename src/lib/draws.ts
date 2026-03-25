import { randomInt } from "node:crypto";

import { DRAW_TIER_PERCENTAGES } from "@/lib/constants";
import { AppConfig, Database, DrawFocus, DrawMode, DrawResult, DrawWinner, User } from "@/lib/types";
import { createId, getCurrentMonthKey, nowIso, subscriptionHasAccess } from "@/lib/utils";

function uniqueScores(user: User) {
  return [...new Set(user.scores.map((score) => score.value))];
}

export function getEligibleUsers(users: User[]) {
  return users.filter((user) => subscriptionHasAccess(user.subscription) && user.scores.length >= 5);
}

function pickUniqueRandomNumbers(count: number, min = 1, max = 45) {
  const numbers = new Set<number>();

  while (numbers.size < count) {
    numbers.add(randomInt(min, max + 1));
  }

  return [...numbers].sort((a, b) => a - b);
}

function buildFrequencyMap(users: User[]) {
  const frequency = new Map<number, number>();

  for (const user of users) {
    for (const score of uniqueScores(user)) {
      frequency.set(score, (frequency.get(score) ?? 0) + 1);
    }
  }

  return frequency;
}

function pickWeightedNumbers(focus: DrawFocus, users: User[]) {
  const frequency = buildFrequencyMap(users);
  const maxFrequency = Math.max(...frequency.values(), 0);
  const available = Array.from({ length: 45 }, (_, index) => index + 1);
  const picked: number[] = [];

  while (picked.length < 5 && available.length > 0) {
    const weights = available.map((score) => {
      const count = frequency.get(score) ?? 0;
      return focus === "hot" ? count + 1 : maxFrequency - count + 1;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const ticket = randomInt(1, totalWeight + 1);

    let cursor = 0;
    let chosenIndex = 0;

    for (let index = 0; index < weights.length; index += 1) {
      cursor += weights[index];

      if (ticket <= cursor) {
        chosenIndex = index;
        break;
      }
    }

    picked.push(available[chosenIndex]);
    available.splice(chosenIndex, 1);
  }

  return picked.sort((a, b) => a - b);
}

export function generateDrawNumbers(mode: DrawMode, focus: DrawFocus, users: User[]) {
  return mode === "random" ? pickUniqueRandomNumbers(5) : pickWeightedNumbers(focus, users);
}

export function countMatches(user: User, drawnNumbers: number[]) {
  const userNumbers = new Set(uniqueScores(user));
  return drawnNumbers.filter((number) => userNumbers.has(number)).length;
}

function getLatestRollover(draws: DrawResult[], month: string) {
  const priorDraws = draws
    .filter((draw) => draw.isPublished && draw.month < month)
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  return priorDraws[0]?.prizePool.rollover ?? 0;
}

export function createDrawSimulation({
  db,
  month = getCurrentMonthKey(),
  mode,
  focus,
  notes,
}: {
  db: Database;
  month?: string;
  mode: DrawMode;
  focus: DrawFocus;
  notes: string;
}) {
  const eligibleUsers = getEligibleUsers(db.users);
  const drawnNumbers = generateDrawNumbers(mode, focus, eligibleUsers);
  const participants = eligibleUsers.map((user) => user.id);
  const activeUsers = db.users.filter((user) => subscriptionHasAccess(user.subscription));
  const grossSubscriptions = activeUsers.reduce((sum, user) => {
    return sum + db.config.planPricing[user.subscription.plan];
  }, 0);

  const basePool = grossSubscriptions * db.config.prizeContributionRate;
  const carriedRollover = getLatestRollover(db.draws, month);
  const fiveShare = basePool * DRAW_TIER_PERCENTAGES[5] + carriedRollover;
  const fourShare = basePool * DRAW_TIER_PERCENTAGES[4];
  const threeShare = basePool * DRAW_TIER_PERCENTAGES[3];

  const matchedUsers = eligibleUsers
    .map((user) => ({
      user,
      matchCount: countMatches(user, drawnNumbers),
    }))
    .filter((entry) => entry.matchCount >= 3) as Array<{
    user: User;
    matchCount: 3 | 4 | 5;
  }>;

  const winnerBuckets = {
    5: matchedUsers.filter((entry) => entry.matchCount === 5),
    4: matchedUsers.filter((entry) => entry.matchCount === 4),
    3: matchedUsers.filter((entry) => entry.matchCount === 3),
  };

  const winners: DrawWinner[] = [];

  for (const [matchCount, bucket] of [
    [5, winnerBuckets[5]],
    [4, winnerBuckets[4]],
    [3, winnerBuckets[3]],
  ] as const) {
    const tierTotal = matchCount === 5 ? fiveShare : matchCount === 4 ? fourShare : threeShare;
    const perWinner = bucket.length > 0 ? tierTotal / bucket.length : 0;

    for (const { user } of bucket) {
      winners.push({
        id: createId("winner"),
        userId: user.id,
        matchCount,
        amount: perWinner,
        proofStatus: "awaiting_upload",
        payoutStatus: "pending",
        proofAsset: null,
        proofSubmittedAt: null,
        reviewedAt: null,
        reviewNotes: null,
      });
    }
  }

  return {
    id: createId("draw"),
    month,
    numbers: drawnNumbers,
    mode,
    focus,
    isPublished: false,
    simulationNotes: notes,
    simulatedAt: nowIso(),
    publishedAt: null,
    entriesCount: participants.length,
    participants,
    winners,
    prizePool: {
      activeSubscribers: activeUsers.length,
      grossSubscriptions,
      basePool,
      carriedRollover,
      totalPool: basePool + carriedRollover,
      fiveShare,
      fourShare,
      threeShare,
      rollover: winnerBuckets[5].length > 0 ? 0 : fiveShare,
    },
  } satisfies DrawResult;
}

export function hydrateSubscriptions(db: Database) {
  const now = Date.now();
  let changed = false;

  for (const user of db.users) {
    const subscription = user.subscription;

    if (!subscription.renewalDate) {
      continue;
    }

    const renewal = new Date(subscription.renewalDate).getTime();

    if (subscription.status === "cancelled" && renewal < now) {
      subscription.status = "lapsed";
      changed = true;
      continue;
    }

    if (subscription.status === "active" && renewal < now) {
      if (subscription.autoRenew) {
        const next = new Date(subscription.renewalDate);
        next.setMonth(next.getMonth() + (subscription.plan === "monthly" ? 1 : 12));
        subscription.renewalDate = next.toISOString();
        subscription.lastPaymentAt = nowIso();
      } else {
        subscription.status = "lapsed";
      }
      changed = true;
    }
  }

  return changed;
}

export function buildProjectedCharityTotals(db: Database) {
  const totals = new Map<string, number>();

  for (const user of db.users) {
    if (!subscriptionHasAccess(user.subscription)) {
      continue;
    }

    const amount = db.config.planPricing[user.subscription.plan] * (user.charityPercentage / 100);
    totals.set(user.selectedCharityId, (totals.get(user.selectedCharityId) ?? 0) + amount);
  }

  for (const donation of db.donations) {
    totals.set(donation.charityId, (totals.get(donation.charityId) ?? 0) + donation.amount);
  }

  return totals;
}

export function getUserWins(db: Database, userId: string) {
  return db.draws
    .filter((draw) => draw.isPublished)
    .flatMap((draw) =>
      draw.winners
        .filter((winner) => winner.userId === userId)
        .map((winner) => ({
          ...winner,
          drawId: draw.id,
          month: draw.month,
          drawNumbers: draw.numbers,
        })),
    )
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export function getAnalytics(db: Database) {
  const activeSubscribers = db.users.filter((user) => subscriptionHasAccess(user.subscription));
  const charityTotals = buildProjectedCharityTotals(db);
  const totalPrizePool = db.draws
    .filter((draw) => draw.isPublished)
    .reduce((sum, draw) => sum + draw.prizePool.totalPool, 0);
  const totalPayouts = db.draws
    .filter((draw) => draw.isPublished)
    .flatMap((draw) => draw.winners)
    .reduce((sum, winner) => sum + winner.amount, 0);

  return {
    totalUsers: db.users.length,
    activeSubscribers: activeSubscribers.length,
    totalPrizePool,
    totalPayouts,
    totalProjectedCharity: [...charityTotals.values()].reduce((sum, amount) => sum + amount, 0),
    publishedDraws: db.draws.filter((draw) => draw.isPublished).length,
  };
}

export function getDrawSummary(draw: DrawResult, config: AppConfig) {
  return {
    label: `${draw.entriesCount} live entries`,
    poolLabel: `${config.currency} pool snapshot`,
    winnerCount: draw.winners.length,
  };
}
