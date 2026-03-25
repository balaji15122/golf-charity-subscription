import { cn } from "@/lib/utils";

const toneMap = {
  active: "bg-emerald-100 text-emerald-900",
  inactive: "bg-slate-200 text-slate-800",
  cancelled: "bg-amber-100 text-amber-900",
  lapsed: "bg-rose-100 text-rose-900",
  pending: "bg-amber-100 text-amber-900",
  paid: "bg-emerald-100 text-emerald-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900",
  awaiting_upload: "bg-slate-200 text-slate-800",
  pending_review: "bg-sky-100 text-sky-900",
} as const;

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof toneMap;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase",
        toneMap[tone],
      )}
    >
      {label}
    </span>
  );
}
