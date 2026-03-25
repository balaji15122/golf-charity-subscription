import {
  addScoreAction,
  makeIndependentDonationAction,
  updateCharityPreferenceAction,
  updateProfileAction,
  updateScoreAction,
  updateSubscriptionAction,
  uploadWinnerProofAction,
} from "@/app/actions";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { COUNTRY_OPTIONS } from "@/lib/constants";
import { buildProjectedCharityTotals, getUserWins } from "@/lib/draws";
import { getCurrentDraftDraw, getPublishedDraws, readDatabase } from "@/lib/db";
import { formatCurrency, formatDate, getNextDrawLabel, subscriptionHasAccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

function readQueryValue(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key] : "";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await requireUser();
  const [db, params] = await Promise.all([readDatabase(), searchParams]);
  const user = db.users.find((entry) => entry.id === current.id);

  if (!user) {
    return null;
  }

  const selectedCharity = db.charities.find((charity) => charity.id === user.selectedCharityId) ?? db.charities[0];
  const publishedDraws = getPublishedDraws(db);
  const draftDraw = getCurrentDraftDraw(db);
  const wins = getUserWins(db, user.id);
  const totalWon = wins.reduce((sum, win) => sum + win.amount, 0);
  const accessEnabled = subscriptionHasAccess(user.subscription);
  const drawsEntered = publishedDraws.filter((draw) => draw.participants.includes(user.id)).length;
  const pendingProofs = wins.filter((win) => win.proofStatus === "awaiting_upload" || win.proofStatus === "rejected");
  const pendingPayouts = wins.filter((win) => win.payoutStatus === "pending");
  const charityTotals = buildProjectedCharityTotals(db);
  const message = readQueryValue(params, "message");
  const error = readQueryValue(params, "error");

  return (
    <div className="space-y-6">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="surface-grid p-8 sm:p-10 reveal-up">
          <span className="eyebrow">Subscriber dashboard</span>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-6xl leading-[0.92] text-slate-950">{user.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                Manage your membership, keep your five most recent Stableford rounds current, and track any prize
                outcomes tied to published draws.
              </p>
            </div>
            <StatusPill label={user.subscription.status} tone={user.subscription.status} />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Plan</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-slate-950">{user.subscription.plan}</p>
              <p className="mt-1 text-sm text-slate-600">Renews {formatDate(user.subscription.renewalDate, "short")}</p>
            </div>
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Draws entered</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{drawsEntered}</p>
              <p className="mt-1 text-sm text-slate-600">Next scheduled draw {getNextDrawLabel(db.config.monthlyDrawDay)}</p>
            </div>
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total won</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(totalWon, db.config.currency)}</p>
              <p className="mt-1 text-sm text-slate-600">{pendingPayouts.length} payouts still pending</p>
            </div>
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chosen charity</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedCharity.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {user.charityPercentage}% contribution • {formatCurrency(charityTotals.get(selectedCharity.id) ?? 0, db.config.currency)} projected
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-7 reveal-up reveal-delay-1">
          <span className="eyebrow">Membership controls</span>
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Access status</p>
              <p className="mt-2 text-3xl font-semibold">{accessEnabled ? "Unlocked" : "Restricted"}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                Score entry and draw participation require an active or in-cycle cancelled subscription.
              </p>
            </div>

            <form action={updateSubscriptionAction} className="space-y-4">
              <input type="hidden" name="intent" value="change" />
              <div>
                <label className="field-label" htmlFor="plan">
                  Plan
                </label>
                <select id="plan" name="plan" defaultValue={user.subscription.plan} className="w-full">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-[20px] border border-slate-950/8 bg-white/75 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" name="autoRenew" defaultChecked={user.subscription.autoRenew} />
                Auto-renew on the next billing date
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Save subscription settings
                </button>
                {user.subscription.status === "active" || user.subscription.status === "cancelled" ? (
                  <button
                    className="rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900"
                    formAction={updateSubscriptionAction}
                    name="intent"
                    value="cancel"
                  >
                    Cancel after current cycle
                  </button>
                ) : (
                  <button
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900"
                    formAction={updateSubscriptionAction}
                    name="intent"
                    value="reactivate"
                  >
                    Reactivate access
                  </button>
                )}
              </div>
            </form>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel className="p-7 reveal-up">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Score management</span>
              <h2 className="mt-4 font-display text-5xl text-slate-950">Rolling five-score bank</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-slate-600">
              New entries automatically replace the oldest round once you go beyond five dated Stableford scores.
            </p>
          </div>

          {!accessEnabled ? (
            <div className="mt-6 rounded-[24px] border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Your current subscription state is restricting score entry. Reactivate from the membership panel to
              continue building your draw eligibility.
            </div>
          ) : null}

          <form action={addScoreAction} className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="field-label" htmlFor="scoreValue">
                Stableford score
              </label>
              <input id="scoreValue" name="value" type="number" min={1} max={45} defaultValue={32} className="w-full" disabled={!accessEnabled} />
            </div>
            <div>
              <label className="field-label" htmlFor="playedAt">
                Date played
              </label>
              <input id="playedAt" name="playedAt" type="date" className="w-full" disabled={!accessEnabled} />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!accessEnabled}
              >
                Add score
              </button>
            </div>
          </form>

          <div className="mt-8 space-y-4 reveal-group">
            {user.scores.map((score) => (
              <form key={score.id} action={updateScoreAction} className="grid gap-4 rounded-[24px] border border-slate-950/8 bg-white/75 p-4 md:grid-cols-[0.8fr_1fr_auto]">
                <input type="hidden" name="scoreId" value={score.id} />
                <div>
                  <label className="field-label">Score</label>
                  <input name="value" type="number" min={1} max={45} defaultValue={score.value} className="w-full" />
                </div>
                <div>
                  <label className="field-label">Played at</label>
                  <input name="playedAt" type="date" defaultValue={score.playedAt} className="w-full" />
                </div>
                <div className="flex items-end">
                  <button className="w-full rounded-full border border-slate-950/10 px-5 py-3 text-sm font-semibold text-slate-900">
                    Save edit
                  </button>
                </div>
              </form>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="p-7 reveal-up reveal-delay-1">
            <span className="eyebrow">Charity settings</span>
            <h2 className="mt-4 font-display text-4xl text-slate-950">Keep your impact aligned.</h2>
            <form action={updateCharityPreferenceAction} className="mt-6 grid gap-4">
              <div>
                <label className="field-label" htmlFor="charityId">
                  Selected charity
                </label>
                <select id="charityId" name="charityId" defaultValue={selectedCharity.id} className="w-full">
                  {db.charities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name} • {charity.category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="charityPercentage">
                  Subscription contribution %
                </label>
                <input
                  id="charityPercentage"
                  name="charityPercentage"
                  type="number"
                  min={db.config.minimumCharityPercentage}
                  max={80}
                  defaultValue={user.charityPercentage}
                  className="w-full"
                />
              </div>
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                Save charity preference
              </button>
            </form>

            <form action={makeIndependentDonationAction} className="mt-6 grid gap-4 rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <input type="hidden" name="charityId" value={selectedCharity.id} />
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <div>
                <label className="field-label" htmlFor="amount">
                  One-off donation
                </label>
                <input id="amount" name="amount" type="number" min={10} defaultValue={25} className="w-full" />
              </div>
              <div>
                <label className="field-label" htmlFor="note">
                  Note
                </label>
                <textarea id="note" name="note" placeholder="Optional context for the donation." className="w-full" />
              </div>
              <button className="rounded-full border border-slate-950/10 px-5 py-3 text-sm font-semibold text-slate-900">
                Add one-off donation
              </button>
            </form>
          </Panel>

          <Panel className="p-7 reveal-up reveal-delay-2">
            <span className="eyebrow">Profile</span>
            <form action={updateProfileAction} className="mt-6 grid gap-4">
              <div>
                <label className="field-label" htmlFor="name">
                  Name
                </label>
                <input id="name" name="name" defaultValue={user.name} className="w-full" />
              </div>
              <div>
                <label className="field-label" htmlFor="country">
                  Country
                </label>
                <select id="country" name="country" defaultValue={user.country} className="w-full">
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="bio">
                  Short bio
                </label>
                <textarea id="bio" name="bio" defaultValue={user.bio} className="w-full" />
              </div>
              <button className="rounded-full border border-slate-950/10 px-5 py-3 text-sm font-semibold text-slate-900">
                Save profile
              </button>
            </form>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-7 reveal-up">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Participation & winnings</span>
              <h2 className="mt-4 font-display text-5xl text-slate-950">Published draw history</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-slate-600">
              Draft simulations stay hidden until admin publishes results. Current month status:
              {draftDraw ? ` ${draftDraw.month} awaiting publish.` : " no draft available."}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {publishedDraws.length === 0 ? (
              <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4 text-sm text-slate-700">
                No published draws yet.
              </div>
            ) : (
              publishedDraws.map((draw) => {
                const win = wins.find((entry) => entry.drawId === draw.id);

                return (
                  <div key={draw.id} className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{draw.month}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {draw.numbers.map((number) => (
                            <span
                              key={number}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white"
                            >
                              {number}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your result</p>
                        {win ? (
                          <>
                            <p className="mt-2 text-xl font-semibold text-slate-950">
                              {win.matchCount}-match • {formatCurrency(win.amount, db.config.currency)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              Proof {win.proofStatus.replaceAll("_", " ")} • payout {win.payoutStatus}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-slate-600">No prize on this draw.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="p-7 reveal-up reveal-delay-1">
            <span className="eyebrow">Proof upload</span>
            <div className="mt-6 space-y-4">
              {pendingProofs.length === 0 ? (
                <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4 text-sm text-slate-700">
                  No proof submissions are currently required.
                </div>
              ) : (
                pendingProofs.map((win) => (
                  <form key={win.id} action={uploadWinnerProofAction} className="grid gap-4 rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                    <input type="hidden" name="drawId" value={win.drawId} />
                    <input type="hidden" name="winnerId" value={win.id} />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{win.month}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {win.matchCount}-match • {formatCurrency(win.amount, db.config.currency)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Status: {win.proofStatus.replaceAll("_", " ")}
                      </p>
                    </div>
                    <input name="proof" type="file" accept="image/*" className="w-full" />
                    <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                      Upload screenshot proof
                    </button>
                  </form>
                ))
              )}
            </div>
          </Panel>

          <Panel className="p-7 reveal-up reveal-delay-2">
            <span className="eyebrow">Notifications</span>
            <div className="mt-6 space-y-3">
              {user.notifications.map((notification) => (
                <div key={notification.id} className="rounded-[22px] border border-slate-950/8 bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{notification.type}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">{notification.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{notification.body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
