"use client";

import { Library, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const accountLinks = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/collections", label: "Collections", icon: Library },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
      className="flex gap-2 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 lg:flex-col"
    >
      {accountLinks.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/account"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
              isActive
                ? "bg-[var(--blue-soft)] text-[var(--blue)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            }`}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" size={15} />
            {label}
          </Link>
        );
      })}
      <Link
        className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
        href="/account#delete-account"
      >
        Request account deletion
      </Link>
    </nav>
  );
}
