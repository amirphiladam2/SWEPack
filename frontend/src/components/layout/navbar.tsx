"use client";

import { Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function isActive(path: string) {
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-5 sm:px-8">
      <Link className="text-base font-bold tracking-[-0.05em] text-[var(--text)]" href="/">
        SWEPack
      </Link>
      <nav className={`${isMenuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-[var(--line)] bg-[var(--bg)] p-3 shadow-lg sm:static sm:flex sm:h-full sm:flex-row sm:items-center sm:gap-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`} aria-label="Main navigation">
        <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/" onClick={() => setIsMenuOpen(false)}>
          Resources
        </Link>
        <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/collections") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/collections" onClick={() => setIsMenuOpen(false)}>
          Collections
        </Link>
        <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/submit") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/submit" onClick={() => setIsMenuOpen(false)}>
          Submit a link
        </Link>
        <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/login") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/login" onClick={() => setIsMenuOpen(false)}>
          Sign in
        </Link>
        <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/admin") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/admin" onClick={() => setIsMenuOpen(false)}>
          Admin
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button className="hidden h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] sm:grid" aria-label="Open account menu">
          <User size={16} />
        </button>
        <button
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] sm:hidden"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
    </header>
  );
}
