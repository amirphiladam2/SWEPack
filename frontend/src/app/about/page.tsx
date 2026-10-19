import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bookmark, Compass, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About SWEPack",
  description:
    "Learn about SWEPack, a community-built library for discovering and sharing useful software engineering resources.",
};

const values = [
  {
    icon: Compass,
    title: "Find what helps",
    description:
      "Explore tools, libraries, documentation, courses, guides, repositories, and communities from one organized library.",
  },
  {
    icon: Bookmark,
    title: "Keep good finds close",
    description:
      "Save useful resources and group them into collections that fit the way you work and learn.",
  },
  {
    icon: Users,
    title: "Built by the community",
    description:
      "Share resources you find valuable. Community submissions are reviewed before they join the library.",
  },
];

export default function AboutPage() {
  return (
    <main className="page-shell flex-1">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-12 sm:px-10 sm:py-16">
        <div className="max-w-3xl">
          <p className="eyebrow mb-4">About SWEPack</p>
          <h1 className="mb-5 font-[family-name:var(--font-geist)] text-[clamp(2.5rem,5vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.055em]">
            Good resources make better work possible.
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
            SWEPack is a community-built library for discovering and sharing
            useful resources in software engineering. We bring worthwhile finds
            together so developers can spend less time searching and more time
            building, learning, and solving problems.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mb-7 max-w-2xl">
          <p className="eyebrow mb-3">A library that grows with you</p>
          <h2 className="mb-3 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
            Discover, organize, and share.
          </h2>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Whether you are starting a project, exploring a new technology, or
            looking for a better way to work, SWEPack helps you find your next
            useful resource.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
            <article
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6"
              key={title}
            >
              <span className="mb-5 grid h-10 w-10 place-items-center rounded-lg bg-[var(--blue-soft)] text-[var(--blue)]">
                <Icon size={19} aria-hidden="true" />
              </span>
              <h3 className="mb-2 text-base font-bold">{title}</h3>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-between gap-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="mb-2 text-xl font-extrabold tracking-[-.03em]">
            Have a resource worth sharing?
          </h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Help the community discover something useful.
          </p>
        </div>
        <Link
          className="primary-action inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition"
          href="/submit"
        >
          Submit a resource <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
