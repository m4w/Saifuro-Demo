"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { paymentsQuery } from "@/lib/api/queries";
import { getPaymentStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const links = [
  { href: "/approvals", label: "Approval queue" },
  { href: "/payments", label: "Payment history" },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const { data: pending } = useQuery({
    ...paymentsQuery,
    select: (payments) =>
      payments.filter((p) => getPaymentStatus(p) === "needs_approval").length,
  });

  return (
    <nav aria-label="Main" className="px-3">
      <ul className="flex gap-1 lg:flex-col">
        {links.map(({ href, label }) => {
          // A payment detail page belongs to neither list, so neither link is current there.
          const current = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                  current
                    ? "bg-surface-muted font-medium text-text"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                )}
              >
                {label}
                {href === "/approvals" &&
                  pending !== undefined &&
                  pending > 0 && (
                    <span className="rounded-full bg-accent px-1.5 text-xs font-medium text-on-accent tabular-nums">
                      {pending}
                      <span className="sr-only"> waiting</span>
                    </span>
                  )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
