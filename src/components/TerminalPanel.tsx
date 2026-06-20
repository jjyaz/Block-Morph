import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function TerminalPanel({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-neon/25 bg-black/70 shadow-neon-soft", className)}>
      <div className="flex items-center gap-2 border-b border-neon/20 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-neon">
        <span className="h-2 w-2 rounded-full bg-neon shadow-neon" />
        {title}
      </div>
      <div className="p-4 text-sm text-green-100/80">{children}</div>
    </section>
  );
}
