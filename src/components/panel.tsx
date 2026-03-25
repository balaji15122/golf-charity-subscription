import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "panel-surface spotlight-card rounded-[30px] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(18,36,30,0.08)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}
