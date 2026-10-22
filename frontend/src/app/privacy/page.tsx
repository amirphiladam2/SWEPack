import Link from "next/link";
import { AccountSidebar } from "@/components/account/account-sidebar";

export default function PrivacyPage() {
  return (
    <main className="page-shell flex-1 py-8 sm:py-12">
      <header className="mb-8">
        <p className="eyebrow mb-2">YOUR ACCOUNT</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy information
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          What account information SWEPack uses and how to request its removal.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AccountSidebar />
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-xs text-[var(--muted)]">
            Last updated: October 22, 2026
          </p>
          <div className="mt-6 grid gap-7 text-sm leading-7 text-[var(--muted)]">
            <section>
              <h2 className="text-base font-bold text-[var(--text)]">
                Information associated with your account
              </h2>
              <p className="mt-2">
                SWEPack stores account information such as your name, email
                address, authentication identifiers, and account role. If you
                use GitHub sign-in or connect a GitHub account, SWEPack stores
                the GitHub account identifier needed to provide that feature.
                Collections, saved resources, and resources you submit are
                associated with your account.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[var(--text)]">
                How information is used
              </h2>
              <p className="mt-2">
                Account information is used to authenticate you, provide account
                features, associate your saved and submitted content with you,
                and maintain the security of the service. Firebase
                Authentication supports email sign-in and password recovery.
                GitHub is used when you choose its sign-in or account-linking
                feature.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[var(--text)]">
                Service providers
              </h2>
              <p className="mt-2">
                SWEPack relies on hosting, database, authentication, and email
                delivery providers to operate the website and its account
                features. Password recovery emails for accounts still moving
                from the previous sign-in system may be sent through the
                configured email provider.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[var(--text)]">
                Account deletion requests
              </h2>
              <p className="mt-2">
                You can submit an account deletion request from your{" "}
                <Link
                  className="font-semibold text-[var(--blue)]"
                  href="/account#delete-account"
                >
                  account settings
                </Link>
                . A request is reviewed and does not delete your account
                immediately. Your account and associated content remain
                available while the request is pending. Data may be retained
                where needed to operate or secure the service, or to meet
                applicable obligations.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[var(--text)]">
                Security
              </h2>
              <p className="mt-2">
                SWEPack uses authentication controls and protected sessions to
                help prevent unauthorized access. No online service can
                guarantee absolute security.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
