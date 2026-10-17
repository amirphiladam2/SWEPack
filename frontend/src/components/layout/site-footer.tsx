export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--surface)] px-5 py-7 text-xs text-[var(--muted)] sm:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="max-w-xl">
        SWEPack is a community-built index of resources for modern software teams.
      </span>
      <nav className="flex gap-5">
        <a className="transition-colors hover:text-[var(--text)]" href="#about">About</a>
        <a className="transition-colors hover:text-[var(--text)]" href="https://github.com" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
      </div>
    </footer>
  );
}
