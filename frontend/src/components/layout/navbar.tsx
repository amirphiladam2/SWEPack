"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Plus, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logout } from "@/lib/api";
import { useAuthSession } from "@/components/providers/auth-session-provider";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isReady, clearSession } = useAuthSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  function isActive(path: string) {
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  }

  async function handleSignOut() {
    let logoutFailed = false;
    try {
      await logout();
    } catch {
      logoutFailed = true;
    }
    clearSession();
    queryClient.removeQueries({ queryKey: ["current-user"] });
    queryClient.removeQueries({ queryKey: ["saved-resources"] });
    setIsAccountMenuOpen(false);
    setIsMenuOpen(false);
    router.push(logoutFailed ? "/login?logout=failed" : "/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--header)] px-5 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between">
      <Link className="text-xl font-extrabold tracking-[-0.06em]" href="/" aria-label="SWEPack home">
        <span className="text-[var(--accent)]">SWE</span><span className="text-[var(--brand-ink)]">Pack</span>
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
        {isReady && !currentUser && (
          <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/login") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/login" onClick={() => setIsMenuOpen(false)}>
            Sign in
          </Link>
        )}
        {currentUser?.role === "ADMIN" && (
          <Link className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] sm:flex sm:h-full sm:items-center sm:rounded-none sm:border-b-2 sm:px-0 ${isActive("/admin") ? "text-[var(--blue)] sm:border-[var(--blue)]" : "border-transparent text-[var(--muted)]"}`} href="/admin" onClick={() => setIsMenuOpen(false)}>
            Admin
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/submit" className="primary-action hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white sm:inline-flex"><Plus size={14} /> Add resource</Link>
        <ThemeToggle />
        {currentUser && (
          <div className="relative">
            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--blue)]"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
              onClick={() => setIsAccountMenuOpen((open) => !open)}
            >
              <User size={16} />
            </button>
            {isAccountMenuOpen && (
              <div
                className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-lg"
                role="menu"
              >
                <div className="border-b border-[var(--line)] px-3 py-2">
                  <p className="truncate text-xs font-semibold">{currentUser.name}</p>
                  {currentUser.email && (
                    <p className="truncate text-[11px] text-[var(--muted)]">{currentUser.email}</p>
                  )}
                </div>
                {currentUser.role === "ADMIN" && (
                  <Link
                    className="mt-1 block rounded-lg px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-muted)]"
                    href="/admin"
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Admin console
                  </Link>
                )}
                {!currentUser.githubConnected && (
                  <form action="/api/auth/github/link" method="post">
                    <button
                      className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[var(--surface-muted)]"
                      role="menuitem"
                      type="submit"
                    >
                      Connect GitHub
                    </button>
                  </form>
                )}
                <button
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
        <button
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] sm:hidden"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
      </div>
    </header>
  );
}
