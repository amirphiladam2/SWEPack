import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { SubmitResourceForm } from "@/components/resources/submit-resource-form";
import { SiteFooter } from "@/components/layout/site-footer";

export default function SubmitResourcePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]"><Link href="/">Home</Link><span>›</span><strong className="text-[var(--text)]">Submit a resource</strong>
        </div>
        <header className="mx-auto max-w-2xl py-12 text-left sm:py-16 sm:text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">COMMUNITY SUBMISSIONS</p>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-[-0.06em] sm:text-5xl">Share a resource with the community</h1>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Submit a useful tool, library, guide, or community resource.
            Submissions are reviewed and added to the curated index.
          </p>
        </header>
        <SubmitResourceForm />
      </main>
      <SiteFooter />
    </div>
  );
}
