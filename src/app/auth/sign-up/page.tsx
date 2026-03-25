import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { getCurrentUser } from "@/lib/auth";
import { COUNTRY_OPTIONS, PLAN_COPY } from "@/lib/constants";
import { readDatabase } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, db, params] = await Promise.all([getCurrentUser(), readDatabase(), searchParams]);

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  const error = typeof params.error === "string" ? params.error : "";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-8 sm:p-10 reveal-up">
          <span className="eyebrow">Start subscription</span>
          <h1 className="mt-5 font-display text-6xl leading-[0.92] text-slate-950">Set up your profile, plan, and charity in one flow.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            Sign up as a subscriber, pick a monthly or yearly plan, choose a charity, and keep at least
            {` ${db.config.minimumCharityPercentage}% `}of your fee going to impact.
          </p>

          {error ? (
            <div className="mt-6">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}

          <form action={signUpAction} className="mt-8 grid gap-5 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="name">
                Full name
              </label>
              <input id="name" name="name" placeholder="Jordan Ellis" required className="w-full" />
            </div>
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" placeholder="you@example.com" required className="w-full" />
            </div>
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input id="password" name="password" type="password" placeholder="Create a strong password" required className="w-full" />
            </div>
            <div>
              <label className="field-label" htmlFor="country">
                Country
              </label>
              <select id="country" name="country" defaultValue="United States" className="w-full">
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="field-label" htmlFor="charityId">
                Charity recipient
              </label>
              <select id="charityId" name="charityId" defaultValue={db.config.featuredCharityId} className="w-full">
                {db.charities.map((charity) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name} • {charity.category}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="field-label" htmlFor="charityPercentage">
                Charity contribution %
              </label>
              <input
                id="charityPercentage"
                name="charityPercentage"
                type="number"
                min={db.config.minimumCharityPercentage}
                max={80}
                defaultValue={db.config.minimumCharityPercentage}
                className="w-full"
              />
            </div>

            <div className="md:col-span-2">
              <span className="field-label">Plan</span>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(PLAN_COPY).map(([plan, copy]) => (
                  <label
                    key={plan}
                    className="flex cursor-pointer flex-col rounded-[26px] border border-slate-950/8 bg-white/75 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{copy.label}</p>
                        <p className="mt-1 text-3xl font-semibold text-slate-950">
                          {formatCurrency(db.config.planPricing[plan as keyof typeof db.config.planPricing], db.config.currency)}
                        </p>
                      </div>
                      <input type="radio" name="plan" value={plan} defaultChecked={plan === "monthly"} />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-700">{copy.blurb}</p>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create account and subscribe
              </button>
              <Link className="text-sm font-semibold text-slate-900" href="/auth/sign-in">
                Already subscribed? Sign in.
              </Link>
            </div>
          </form>
        </Panel>

        <Panel className="surface-grid p-8 sm:p-10 reveal-up reveal-delay-1">
          <span className="eyebrow">What you get</span>
          <div className="mt-6 space-y-5">
            {[
              "Protected member dashboard with subscription lifecycle controls.",
              "Rolling 5-score entry system with date tracking and edit support.",
              "Monthly draw participation, published results, and payout monitoring.",
              "Charity selection at signup plus one-off donation support later.",
              "Winner proof upload flow reviewed by the admin dashboard.",
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-slate-950/8 bg-white/75 px-4 py-4 text-sm leading-6 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
