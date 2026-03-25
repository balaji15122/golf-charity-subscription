import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { makeIndependentDonationAction } from "@/app/actions";
import { Panel } from "@/components/panel";
import { getCurrentUser } from "@/lib/auth";
import { buildProjectedCharityTotals } from "@/lib/draws";
import { readDatabase } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CharityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, db, user] = await Promise.all([params, readDatabase(), getCurrentUser()]);
  const charity = db.charities.find((entry) => entry.slug === slug);

  if (!charity) {
    notFound();
  }

  const totals = buildProjectedCharityTotals(db);

  return (
    <div className="space-y-6">
      <Panel className="p-8 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <span className="eyebrow">{charity.category}</span>
            <h1 className="mt-5 font-display text-6xl leading-[0.92] text-slate-950">{charity.name}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{charity.impactHeadline}</p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">{charity.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {charity.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-950/8 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <Panel className="bg-[linear-gradient(135deg,rgba(23,55,45,0.97),rgba(211,146,68,0.88))] p-6 text-white">
            <Image
              alt={charity.name}
              className="h-60 w-full rounded-[24px] object-cover"
              src={charity.image}
              width={720}
              height={480}
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Location</p>
                <p className="mt-1 text-lg font-semibold">{charity.location}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Projected support</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatCurrency(totals.get(charity.id) ?? 0, db.config.currency)}
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-7">
          <span className="eyebrow">Upcoming events</span>
          <div className="mt-6 space-y-4">
            {charity.upcomingEvents.map((event) => (
              <div key={event.id} className="rounded-[24px] border border-slate-950/8 bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{formatDateTime(event.startsAt)}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{event.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{event.location}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-7">
          <span className="eyebrow">Support this charity</span>
          <p className="mt-5 text-base leading-7 text-slate-700">
            Members can direct a percentage of their subscription here and optionally pledge additional one-off
            donations outside the monthly draw model.
          </p>

          {user ? (
            <form action={makeIndependentDonationAction} className="mt-6 grid gap-4">
              <input type="hidden" name="charityId" value={charity.id} />
              <input type="hidden" name="redirectTo" value={`/charities/${charity.slug}`} />
              <div>
                <label className="field-label" htmlFor="amount">
                  One-off amount
                </label>
                <input id="amount" name="amount" type="number" min={10} step={1} defaultValue={50} className="w-full" />
              </div>
              <div>
                <label className="field-label" htmlFor="note">
                  Optional note
                </label>
                <textarea id="note" name="note" placeholder="Reason for support" className="w-full" />
              </div>
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Add one-off donation
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-[24px] border border-slate-950/8 bg-white/75 p-5">
              <p className="text-sm leading-6 text-slate-700">
                Sign in or subscribe to attach this charity to your membership and unlock one-off donations.
              </p>
              <div className="mt-4 flex gap-3">
                <Link className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/auth/sign-up">
                  Subscribe now
                </Link>
                <Link className="rounded-full border border-slate-950/10 px-5 py-3 text-sm font-semibold text-slate-900" href="/auth/sign-in">
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
