import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WireframeCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neon/25 bg-[rgba(40,255,90,0.08)] p-5 shadow-neon-soft backdrop-blur",
        "before:pointer-events-none before:absolute before:inset-0 before:border before:border-white/5",
        className,
      )}
    >
      {children}
    </div>
  );
}
