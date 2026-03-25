export type UserRole = "subscriber" | "admin";
export type PlanId = "monthly" | "yearly";
export type SubscriptionStatus = "inactive" | "active" | "cancelled" | "lapsed";
export type DrawMode = "random" | "algorithmic";
export type DrawFocus = "hot" | "cold";
export type ProofStatus = "awaiting_upload" | "pending_review" | "approved" | "rejected";
export type PayoutStatus = "pending" | "paid";
export type NotificationType = "system" | "draw" | "winner";

export interface AppConfig {
  currency: "USD";
  planPricing: Record<PlanId, number>;
  minimumCharityPercentage: number;
  prizeContributionRate: number;
  featuredCharityId: string;
  monthlyDrawDay: number;
}

export interface Subscription {
  plan: PlanId;
  status: SubscriptionStatus;
  startedAt: string | null;
  renewalDate: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  lastPaymentAt: string | null;
}

export interface ScoreEntry {
  id: string;
  value: number;
  playedAt: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface OneOffDonation {
  id: string;
  userId: string;
  charityId: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  passwordHash: string;
  country: string;
  bio: string;
  createdAt: string;
  selectedCharityId: string;
  charityPercentage: number;
  subscription: Subscription;
  scores: ScoreEntry[];
  notifications: Notification[];
}

export interface CharityEvent {
  id: string;
  title: string;
  startsAt: string;
  location: string;
}

export interface Charity {
  id: string;
  slug: string;
  name: string;
  category: string;
  location: string;
  summary: string;
  impactHeadline: string;
  description: string;
  image: string;
  featured: boolean;
  acceptingNewSupport: boolean;
  upcomingEvents: CharityEvent[];
  tags: string[];
}

export interface DrawWinner {
  id: string;
  userId: string;
  matchCount: 3 | 4 | 5;
  amount: number;
  proofStatus: ProofStatus;
  payoutStatus: PayoutStatus;
  proofAsset: string | null;
  proofSubmittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface DrawPrizePool {
  activeSubscribers: number;
  grossSubscriptions: number;
  basePool: number;
  carriedRollover: number;
  totalPool: number;
  fiveShare: number;
  fourShare: number;
  threeShare: number;
  rollover: number;
}

export interface DrawResult {
  id: string;
  month: string;
  numbers: number[];
  mode: DrawMode;
  focus: DrawFocus;
  isPublished: boolean;
  simulationNotes: string;
  simulatedAt: string;
  publishedAt: string | null;
  entriesCount: number;
  participants: string[];
  winners: DrawWinner[];
  prizePool: DrawPrizePool;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ActivityItem {
  id: string;
  type: "auth" | "subscription" | "score" | "draw" | "charity" | "winner";
  summary: string;
  createdAt: string;
}

export interface Database {
  config: AppConfig;
  sessions: Session[];
  users: User[];
  charities: Charity[];
  donations: OneOffDonation[];
  draws: DrawResult[];
  activity: ActivityItem[];
}
