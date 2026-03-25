import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { APP_NAME } from "@/lib/constants";
import { User } from "@/lib/types";

export function SiteShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(211,146,68,0.22),transparent_40%),radial-gradient(circle_at_top_right,rgba(42,93,76,0.22),transparent_36%),linear-gradient(180deg,rgba(255,251,243,0.95),rgba(247,241,232,0.6))]" />
      <div className="pointer-events-none absolute inset-x-0 top-[22rem] h-[20rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.55),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 pt-4">
          <div className="rounded-full border border-white/60 bg-white/78 px-5 py-3 shadow-[0_12px_60px_rgba(18,36,30,0.10)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#17372d,#d39244)] text-sm font-bold tracking-[0.24em] text-white">
                    GG
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-900/60">
                      Subscription Platform
                    </p>
                    <p className="font-display text-2xl leading-none text-slate-950">{APP_NAME}</p>
                  </div>
                </Link>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                <Link className="rounded-full px-4 py-2 hover:bg-slate-950/5" href="/">
                  Home
                </Link>
                <Link className="rounded-full px-4 py-2 hover:bg-slate-950/5" href="/charities">
                  Charities
                </Link>
                {user ? (
                  <>
                    <Link className="rounded-full px-4 py-2 hover:bg-slate-950/5" href="/dashboard">
                      Dashboard
                    </Link>
                    {user.role === "admin" ? (
                      <Link className="rounded-full px-4 py-2 hover:bg-slate-950/5" href="/admin">
                        Admin
                      </Link>
                    ) : null}
                  </>
                ) : null}
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                {user ? (
                  <>
                    <div className="rounded-full bg-slate-950/5 px-4 py-2 text-sm text-slate-700">
                      <span className="font-semibold text-slate-950">{user.name}</span>
                      <span className="mx-2 text-slate-400">•</span>
                      {user.role}
                    </div>
                    <form action={signOutAction}>
                      <button className="rounded-full border border-slate-950/10 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950/20 hover:bg-slate-950/5">
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      className="rounded-full border border-slate-950/10 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950/20 hover:bg-slate-950/5"
                      href="/auth/sign-in"
                    >
                      Sign in
                    </Link>
                    <Link
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      href="/auth/sign-up"
                    >
                      Subscribe now
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 py-8">{children}</main>

        <footer className="mt-6 rounded-[28px] border border-white/60 bg-white/70 px-6 py-5 text-sm text-slate-600 shadow-[0_10px_40px_rgba(18,36,30,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p>Modern golf subscriptions, monthly draws, and charitable impact in one stack.</p>
            <p>Demo stack: Next.js + file-backed data layer designed for a future Supabase + Stripe swap.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
