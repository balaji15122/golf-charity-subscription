import Image from "next/image";
import Link from "next/link";

import { Panel } from "@/components/panel";
import { buildProjectedCharityTotals } from "@/lib/draws";
import { readDatabase } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [db, params] = await Promise.all([readDatabase(), searchParams]);
  const query = normalizeParam(params.q).toLowerCase();
  const category = normalizeParam(params.category);
  const totals = buildProjectedCharityTotals(db);
  const categories = [...new Set(db.charities.map((charity) => charity.category))];

  const charities = db.charities.filter((charity) => {
    const matchesQuery =
      query.length === 0 ||
      charity.name.toLowerCase().includes(query) ||
      charity.summary.toLowerCase().includes(query) ||
      charity.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesCategory = category.length === 0 || charity.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Panel className="p-8 sm:p-10">
        <span className="eyebrow">Charity directory</span>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h1 className="font-display text-6xl leading-[0.92] text-slate-950">Search causes, compare impact stories, and choose where your subscription lands.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
              Each charity profile includes descriptive content, local or digital events, and projected contribution
              totals from the live member base.
            </p>
          </div>
          <form className="grid gap-4 rounded-[28px] border border-slate-950/8 bg-white/80 p-5" method="get">
            <div>
              <label className="field-label" htmlFor="q">
                Search
              </label>
              <input id="q" name="q" defaultValue={query} placeholder="youth, coastal, women..." className="w-full" />
            </div>
            <div>
              <label className="field-label" htmlFor="category">
                Filter by category
              </label>
              <select id="category" name="category" defaultValue={category} className="w-full">
                <option value="">All categories</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Apply filters
            </button>
          </form>
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {charities.map((charity) => (
          <Link
            key={charity.id}
            href={`/charities/${charity.slug}`}
            className="group rounded-[30px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(18,36,30,0.08)] transition hover:-translate-y-1"
          >
            <Image
              alt={charity.name}
              className="h-56 w-full rounded-[24px] object-cover"
              src={charity.image}
              width={720}
              height={560}
            />
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{charity.category}</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">{charity.name}</h2>
              </div>
              {charity.featured ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                  Featured
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{charity.summary}</p>
            <div className="mt-5 flex items-center justify-between border-t border-slate-950/8 pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Projected support</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatCurrency(totals.get(charity.id) ?? 0, db.config.currency)}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700">Open profile</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
