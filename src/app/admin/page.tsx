import { deleteCharityAction, publishDrawAction, reviewWinnerAction, saveCharityAction, simulateDrawAction, updateUserFromAdminAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { buildProjectedCharityTotals, getAnalytics } from "@/lib/draws";
import { getCurrentDraftDraw, getPublishedDraws, readDatabase } from "@/lib/db";
import { formatCurrency, formatDate, startOfMonthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function readQueryValue(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key] : "";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("admin");
  const [db, params] = await Promise.all([readDatabase(), searchParams]);
  const analytics = getAnalytics(db);
  const draftDraw = getCurrentDraftDraw(db);
  const publishedDraws = getPublishedDraws(db);
  const charityTotals = buildProjectedCharityTotals(db);
  const message = readQueryValue(params, "message");
  const error = readQueryValue(params, "error");

  return (
    <div className="space-y-6">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="surface-grid p-8 sm:p-10 reveal-up">
          <span className="eyebrow">Admin dashboard</span>
          <h1 className="mt-5 font-display text-6xl leading-[0.92] text-slate-950">Subscriptions, draw logic, charities, and payout controls in one place.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            This workspace covers user management, draft simulation, official publish flow, charity CRUD, winner
            review, and the headline analytics required in the PRD.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total users</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.totalUsers}</p>
            </div>
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Active subscribers</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.activeSubscribers}</p>
            </div>
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prize pool funded</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatCurrency(analytics.totalPrizePool, db.config.currency)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projected charity</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatCurrency(analytics.totalProjectedCharity, db.config.currency)}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-7 reveal-up reveal-delay-1">
          <span className="eyebrow">Draw studio</span>
          <form action={simulateDrawAction} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="mode">
                  Mode
                </label>
                <select id="mode" name="mode" defaultValue={draftDraw?.mode ?? "random"} className="w-full">
                  <option value="random">Random</option>
                  <option value="algorithmic">Algorithmic</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="focus">
                  Frequency focus
                </label>
                <select id="focus" name="focus" defaultValue={draftDraw?.focus ?? "hot"} className="w-full">
                  <option value="hot">Most frequent scores</option>
                  <option value="cold">Least frequent scores</option>
                </select>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="notes">
                Simulation notes
              </label>
              <textarea id="notes" name="notes" defaultValue={draftDraw?.simulationNotes ?? "Admin simulation run."} className="w-full" />
            </div>
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Run simulation
            </button>
          </form>

          {draftDraw ? (
            <div className="mt-6 rounded-[26px] border border-slate-950/8 bg-white/75 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current draft</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{startOfMonthLabel(draftDraw.month)}</h2>
                </div>
                <StatusPill label={`${draftDraw.mode} / ${draftDraw.focus}`} tone="pending_review" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {draftDraw.numbers.map((number) => (
                  <span
                    key={number}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white"
                  >
                    {number}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] bg-slate-950/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entries</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{draftDraw.entriesCount}</p>
                </div>
                <div className="rounded-[20px] bg-slate-950/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projected total pool</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">
                    {formatCurrency(draftDraw.prizePool.totalPool, db.config.currency)}
                  </p>
                </div>
              </div>
              <form action={publishDrawAction} className="mt-5">
                <input type="hidden" name="drawId" value={draftDraw.id} />
                <button className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900">
                  Publish draw
                </button>
              </form>
            </div>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel className="p-7 reveal-up">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">User management</span>
              <h2 className="mt-4 font-display text-5xl text-slate-950">Edit profiles, subscriptions, and scores.</h2>
            </div>
          </div>
          <div className="mt-8 space-y-5">
            {db.users.map((user) => (
              <form key={user.id} action={updateUserFromAdminAction} className="rounded-[28px] border border-slate-950/8 bg-white/75 p-5">
                <input type="hidden" name="userId" value={user.id} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="field-label">Name</label>
                    <input name="name" defaultValue={user.name} className="w-full" />
                  </div>
                  <div>
                    <label className="field-label">Country</label>
                    <input name="country" defaultValue={user.country} className="w-full" />
                  </div>
                  <div>
                    <label className="field-label">Role</label>
                    <select name="role" defaultValue={user.role} className="w-full">
                      <option value="subscriber">Subscriber</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Selected charity</label>
                    <select name="charityId" defaultValue={user.selectedCharityId} className="w-full">
                      {db.charities.map((charity) => (
                        <option key={charity.id} value={charity.id}>
                          {charity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Contribution %</label>
                    <input name="charityPercentage" type="number" min={db.config.minimumCharityPercentage} max={80} defaultValue={user.charityPercentage} className="w-full" />
                  </div>
                  <div>
                    <label className="field-label">Plan</label>
                    <select name="plan" defaultValue={user.subscription.plan} className="w-full">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Status</label>
                    <select name="status" defaultValue={user.subscription.status} className="w-full">
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="lapsed">Lapsed</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Renewal date</label>
                    <input name="renewalDate" type="date" defaultValue={user.subscription.renewalDate?.slice(0, 10)} className="w-full" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="field-label">Bio</label>
                    <textarea name="bio" defaultValue={user.bio} className="w-full" />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-[20px] border border-slate-950/8 bg-white/60 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" name="autoRenew" defaultChecked={user.subscription.autoRenew} />
                  Auto renew
                </label>

                <div className="mt-5 grid gap-3">
                  {user.scores.map((score) => (
                    <div key={score.id} className="grid gap-3 md:grid-cols-[0.8fr_1fr]">
                      <input type="hidden" name="scoreId" value={score.id} />
                      <input name="scoreValue" type="number" min={1} max={45} defaultValue={score.value} className="w-full" />
                      <input name="scorePlayedAt" type="date" defaultValue={score.playedAt} className="w-full" />
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="text-sm text-slate-600">{user.email}</div>
                  <button className="rounded-full border border-slate-950/10 px-5 py-3 text-sm font-semibold text-slate-900">
                    Save user
                  </button>
                </div>
              </form>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="p-7 reveal-up reveal-delay-1">
            <span className="eyebrow">Charity management</span>
            <div className="mt-6 grid gap-5">
              <form action={saveCharityAction} className="rounded-[26px] border border-slate-950/8 bg-white/75 p-5">
                <h3 className="text-xl font-semibold text-slate-950">Add new charity</h3>
                <div className="mt-4 grid gap-4">
                  <input name="name" placeholder="Charity name" className="w-full" />
                  <input name="slug" placeholder="optional-slug" className="w-full" />
                  <input name="category" placeholder="Category" className="w-full" />
                  <input name="location" placeholder="Location" className="w-full" />
                  <input name="image" placeholder="/charity-art.svg" className="w-full" />
                  <input name="impactHeadline" placeholder="Impact headline" className="w-full" />
                  <input name="tags" placeholder="tag-one, tag-two" className="w-full" />
                  <textarea name="summary" placeholder="Short summary" className="w-full" />
                  <textarea name="description" placeholder="Long description" className="w-full" />
                  <label className="flex items-center gap-3 rounded-[20px] border border-slate-950/8 bg-white/60 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" name="featured" />
                    Featured on homepage
                  </label>
                  <label className="flex items-center gap-3 rounded-[20px] border border-slate-950/8 bg-white/60 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" name="acceptingNewSupport" defaultChecked />
                    Accepting support
                  </label>
                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                    Create charity
                  </button>
                </div>
              </form>

              {db.charities.map((charity) => (
                <form key={charity.id} action={saveCharityAction} className="rounded-[26px] border border-slate-950/8 bg-white/75 p-5">
                  <input type="hidden" name="id" value={charity.id} />
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-semibold text-slate-950">{charity.name}</h3>
                    {charity.featured ? <StatusPill label="featured" tone="approved" /> : null}
                  </div>
                  <div className="mt-4 grid gap-4">
                    <input name="name" defaultValue={charity.name} className="w-full" />
                    <input name="slug" defaultValue={charity.slug} className="w-full" />
                    <input name="category" defaultValue={charity.category} className="w-full" />
                    <input name="location" defaultValue={charity.location} className="w-full" />
                    <input name="image" defaultValue={charity.image} className="w-full" />
                    <input name="impactHeadline" defaultValue={charity.impactHeadline} className="w-full" />
                    <input name="tags" defaultValue={charity.tags.join(", ")} className="w-full" />
                    <textarea name="summary" defaultValue={charity.summary} className="w-full" />
                    <textarea name="description" defaultValue={charity.description} className="w-full" />
                    <label className="flex items-center gap-3 rounded-[20px] border border-slate-950/8 bg-white/60 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" name="featured" defaultChecked={charity.featured} />
                      Featured on homepage
                    </label>
                    <label className="flex items-center gap-3 rounded-[20px] border border-slate-950/8 bg-white/60 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" name="acceptingNewSupport" defaultChecked={charity.acceptingNewSupport} />
                      Accepting support
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button className="rounded-full border border-slate-950/10 px-5 py-3 text-sm font-semibold text-slate-900">
                        Save charity
                      </button>
                      <button
                        className="rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900"
                        formAction={deleteCharityAction}
                        name="charityId"
                        value={charity.id}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel className="p-7 reveal-up">
          <span className="eyebrow">Winner verification</span>
          <div className="mt-6 space-y-5">
            {publishedDraws.map((draw) => (
              <div key={draw.id} className="rounded-[28px] border border-slate-950/8 bg-white/75 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{startOfMonthLabel(draw.month)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draw.numbers.map((number) => (
                        <span
                          key={number}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white"
                        >
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">{draw.entriesCount} entries</p>
                    <p className="text-sm text-slate-600">
                      Pool {formatCurrency(draw.prizePool.totalPool, db.config.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {draw.winners.length === 0 ? (
                    <div className="rounded-[22px] border border-slate-950/8 bg-white/70 p-4 text-sm text-slate-700">
                      No winners in this draw.
                    </div>
                  ) : (
                    draw.winners.map((winner) => {
                      const user = db.users.find((entry) => entry.id === winner.userId);

                      if (!user) {
                        return null;
                      }

                      return (
                        <form key={winner.id} action={reviewWinnerAction} className="rounded-[22px] border border-slate-950/8 bg-white/70 p-4">
                          <input type="hidden" name="drawId" value={draw.id} />
                          <input type="hidden" name="winnerId" value={winner.id} />
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold text-slate-950">{user.name}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {winner.matchCount}-match • {formatCurrency(winner.amount, db.config.currency)}
                              </p>
                              {winner.proofAsset ? (
                                <a
                                  className="mt-2 inline-block text-sm font-semibold text-slate-900 underline"
                                  href={winner.proofAsset}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View uploaded proof
                                </a>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <StatusPill label={winner.proofStatus.replaceAll("_", " ")} tone={winner.proofStatus} />
                              <StatusPill label={winner.payoutStatus} tone={winner.payoutStatus} />
                            </div>
                          </div>
                          <textarea
                            name="reviewNotes"
                            defaultValue={winner.reviewNotes ?? ""}
                            placeholder="Review notes"
                            className="mt-4 w-full"
                          />
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900"
                              name="intent"
                              value="approve"
                            >
                              Approve proof
                            </button>
                            <button
                              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900"
                              name="intent"
                              value="reject"
                            >
                              Reject proof
                            </button>
                            <button
                              className="rounded-full border border-sky-300 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-900"
                              name="intent"
                              value="mark-paid"
                            >
                              Mark payout paid
                            </button>
                          </div>
                        </form>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="p-7 reveal-up reveal-delay-1">
            <span className="eyebrow">Reports & analytics</span>
            <div className="mt-6 space-y-4">
              {db.charities.map((charity) => (
                <div key={charity.id} className="flex items-center justify-between rounded-[22px] border border-slate-950/8 bg-white/75 px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{charity.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{charity.category}</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-950">
                    {formatCurrency(charityTotals.get(charity.id) ?? 0, db.config.currency)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-7 reveal-up reveal-delay-2">
            <span className="eyebrow">Activity log</span>
            <div className="mt-6 space-y-3">
              {db.activity.map((item) => (
                <div key={item.id} className="rounded-[22px] border border-slate-950/8 bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.type}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt, "short")}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
