import Image from "next/image";
import Link from "next/link";

import { Panel } from "@/components/panel";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME, PLAN_COPY } from "@/lib/constants";
import { buildProjectedCharityTotals, getAnalytics } from "@/lib/draws";
import { getCurrentDraftDraw, getPublishedDraws, readDatabase } from "@/lib/db";
import { formatCurrency, getNextDrawLabel, startOfMonthLabel, subscriptionHasAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [db, user] = await Promise.all([readDatabase(), getCurrentUser()]);
  const featuredCharity = db.charities.find((charity) => charity.id === db.config.featuredCharityId) ?? db.charities[0];
  const charityTotals = buildProjectedCharityTotals(db);
  const analytics = getAnalytics(db);
  const latestDraw = getPublishedDraws(db)[0] ?? null;
  const currentDraft = getCurrentDraftDraw(db);
  const accessibleUsers = db.users.filter((entry) => subscriptionHasAccess(entry.subscription)).length;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel className="surface-grid p-8 sm:p-10">
          <div className="space-y-6">
            <span className="eyebrow">Emotion-led golf platform</span>
            <div className="max-w-3xl space-y-5">
              <h1 className="font-display text-6xl leading-[0.92] text-slate-950 sm:text-7xl">
                Score five rounds.
                <br />
                Fund real causes.
                <br />
                Win monthly draws.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                {APP_NAME} combines Stableford score tracking, subscription billing, draw-based rewards, and
                charity giving in a single full-stack product. The experience leads with impact first, not golf
                cliches.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active members</p>
                <p className="stat-value mt-3 text-slate-950">{analytics.activeSubscribers}</p>
              </div>
              <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Projected impact</p>
                <p className="stat-value mt-3 text-slate-950">
                  {formatCurrency(analytics.totalProjectedCharity, db.config.currency)}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next draw</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{getNextDrawLabel(db.config.monthlyDrawDay)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={user ? "/dashboard" : "/auth/sign-up"}
              >
                {user ? "Open dashboard" : "Start subscription"}
              </Link>
              <Link
                className="rounded-full border border-slate-950/12 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-950/5"
                href="/charities"
              >
                Explore charities
              </Link>
            </div>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="bg-[linear-gradient(135deg,rgba(23,55,45,0.96),rgba(45,99,82,0.92))] p-7 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Current draw studio</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-white/70">Mode</p>
                <p className="mt-1 text-2xl font-semibold capitalize">
                  {currentDraft ? `${currentDraft.mode} • ${currentDraft.focus}` : "Pending admin simulation"}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/70">Entries eligible</p>
                <p className="mt-1 text-2xl font-semibold">{currentDraft?.entriesCount ?? accessibleUsers}</p>
              </div>
            </div>
            <div className="mt-6 rounded-[26px] bg-white/8 p-5">
              <p className="text-sm text-white/65">Preview numbers</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {(currentDraft?.numbers ?? [7, 14, 22, 31, 39]).map((number) => (
                  <div
                    key={number}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/14 bg-white/10 text-lg font-semibold"
                  >
                    {number}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/72">
                Admin can simulate draws before publishing. Jackpot value rolls into the next month if no
                five-number match lands.
              </p>
            </div>
          </Panel>

          <Panel className="p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Featured charity</p>
                <h2 className="mt-2 font-display text-4xl text-slate-950">{featuredCharity.name}</h2>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-amber-700">{featuredCharity.category}</p>
              </div>
              <Image
                alt={featuredCharity.name}
                className="h-20 w-20 rounded-[24px] border border-slate-950/6 bg-slate-100 object-cover"
                src={featuredCharity.image}
                width={80}
                height={80}
              />
            </div>
            <p className="mt-4 text-base leading-7 text-slate-700">{featuredCharity.impactHeadline}</p>
            <div className="mt-6 flex items-center justify-between rounded-[24px] bg-slate-950/5 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Projected support</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {formatCurrency(charityTotals.get(featuredCharity.id) ?? 0, db.config.currency)}
                </p>
              </div>
              <Link className="text-sm font-semibold text-slate-900" href={`/charities/${featuredCharity.slug}`}>
                View profile
              </Link>
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-7">
          <div className="space-y-4">
            <span className="eyebrow">How it works</span>
            <h2 className="font-display text-5xl leading-tight text-slate-950">A draw engine built around your last five Stableford scores.</h2>
            <p className="text-base leading-7 text-slate-700">
              Subscribers retain a rolling bank of five rounds, choose a charity, and get entered into a monthly
              reward cycle once admin publishes the results.
            </p>
          </div>
          <div className="mt-8 grid gap-4">
            {[
              ["1", "Subscribe", "Choose monthly or yearly billing and unlock score entry, dashboard access, and draw participation."],
              ["2", "Track scores", "Add up to five dated Stableford scores. New rounds automatically replace the oldest record."],
              ["3", "Support a cause", "Pick a charity at signup, keep at least 10% of your fee allocated, or add one-off donations."],
              ["4", "Win transparently", "Admin can simulate, publish, verify proof uploads, and mark payouts paid with a full audit trail."],
            ].map(([step, title, description]) => (
              <div key={step} className="flex gap-4 rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#17372d,#d39244)] text-sm font-bold text-white">
                  {step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Subscription plans</span>
              <h2 className="mt-4 font-display text-5xl text-slate-950">Pricing that feeds both the pool and the cause.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-slate-600">
              Prize pool logic is pre-distributed into 40% jackpot, 35% four-match, and 25% three-match tiers.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Object.entries(PLAN_COPY).map(([plan, copy]) => (
              <div
                key={plan}
                className="rounded-[28px] border border-slate-950/8 bg-white/75 p-5 shadow-[0_16px_40px_rgba(20,38,31,0.06)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.label}</p>
                <p className="mt-3 font-display text-5xl text-slate-950">
                  {formatCurrency(db.config.planPricing[plan as keyof typeof db.config.planPricing], db.config.currency)}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-700">{copy.blurb}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-800">
                  <li>Reverse-chronological score history</li>
                  <li>Draw eligibility after five scores</li>
                  <li>Proof upload and payout tracking</li>
                  <li>Charity selection with adjustable contribution %</li>
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel className="p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Charity directory</span>
              <h2 className="mt-4 font-display text-5xl text-slate-950">Searchable profiles with featured impact and live event calendars.</h2>
            </div>
            <Link className="text-sm font-semibold text-slate-900" href="/charities">
              See all charities
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {db.charities.map((charity) => (
              <Link
                key={charity.id}
                href={`/charities/${charity.slug}`}
                className="rounded-[28px] border border-slate-950/8 bg-white/75 p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(20,38,31,0.10)]"
              >
                <Image
                  alt={charity.name}
                  className="h-40 w-full rounded-[22px] object-cover"
                  src={charity.image}
                  width={640}
                  height={360}
                />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{charity.category}</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{charity.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{charity.summary}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-7">
          <span className="eyebrow">Live system snapshot</span>
          <div className="mt-4 space-y-5">
            <div className="rounded-[28px] bg-slate-950 px-5 py-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Last published draw</p>
              <h3 className="mt-2 font-display text-4xl">{latestDraw ? startOfMonthLabel(latestDraw.month) : "No draw published yet"}</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {(latestDraw?.numbers ?? [5, 9, 12, 24, 33]).map((number) => (
                  <span
                    key={number}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold"
                  >
                    {number}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prize pool funded</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {formatCurrency(analytics.totalPrizePool, db.config.currency)}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Published draws</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{analytics.publishedDraws}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-700">
              The stack supports public discovery, member dashboards, admin verification, simulation before publish,
              and future-ready migration to persistent managed infrastructure.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}
