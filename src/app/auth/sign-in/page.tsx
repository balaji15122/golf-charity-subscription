import Link from "next/link";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-8 sm:p-10">
          <span className="eyebrow">Member access</span>
          <h1 className="mt-5 font-display text-6xl leading-[0.92] text-slate-950">Return to your draw dashboard.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-700">
            Sign in to manage subscription status, add scores, upload winner proof, and review charity allocation.
          </p>

          <div className="mt-8 space-y-3">
            {error ? <Notice tone="error">{error}</Notice> : null}
            {message ? <Notice tone="success">{message}</Notice> : null}
          </div>

          <form action={signInAction} className="mt-8 space-y-5">
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
              <input id="password" name="password" type="password" placeholder="Your password" required className="w-full" />
            </div>
            <button className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Sign in
            </button>
          </form>
        </Panel>

        <Panel className="surface-grid p-8 sm:p-10">
          <span className="eyebrow">Seed credentials</span>
          <div className="mt-5 space-y-6">
            <div className="rounded-[26px] border border-slate-950/8 bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subscriber</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">maya@golfforgood.com</p>
              <p className="mt-1 font-mono text-sm text-slate-600">Maya123!</p>
            </div>
            <div className="rounded-[26px] border border-slate-950/8 bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">admin@golfforgood.com</p>
              <p className="mt-1 font-mono text-sm text-slate-600">Admin123!</p>
            </div>
            <p className="text-sm leading-6 text-slate-700">
              New members can also create an account and immediately start a subscription with a chosen charity and
              contribution percentage.
            </p>
            <Link className="text-sm font-semibold text-slate-900" href="/auth/sign-up">
              Need an account? Create one here.
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
