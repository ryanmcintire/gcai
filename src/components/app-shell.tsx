import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-3 rotate-45 rounded-[2px] bg-brand"
            />
            <span className="text-sm font-medium tracking-tight">gcai</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 pt-10 pb-16">
        {children}
      </main>
    </div>
  );
}
