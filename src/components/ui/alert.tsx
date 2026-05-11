import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AlertTone = "info" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  icon?: ReactNode;
  role?: "alert" | "note" | "status";
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<AlertTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100",
  danger:
    "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-100",
};

export function Alert({
  tone = "info",
  icon,
  role = "note",
  children,
  className,
}: AlertProps) {
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex shrink-0 [&_svg]:size-4"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
