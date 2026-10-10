"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const savedTheme = localStorage.getItem("swepack-theme") === "dark";
    const frame = window.requestAnimationFrame(() => {
      setIsDark(savedTheme);
      document.documentElement.dataset.theme = savedTheme ? "dark" : "light";
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("swepack-theme", next ? "dark" : "light");
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }
  return (
    <button
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? (
        <Sun size={15} aria-hidden="true" />
      ) : (
        <Moon size={15} aria-hidden="true" />
      )}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
