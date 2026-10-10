export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-col gap-3 border-t border-[var(--line)] px-5 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <span className="max-w-xl">
        SWEPack is a community-built index of resources for modern software teams.
      </span>
      <nav className="flex gap-5">
        <a className="transition-colors hover:text-[var(--text)]" href="#about">About</a>
        <a className="transition-colors hover:text-[var(--text)]" href="https://github.com" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </footer>
  );
}
