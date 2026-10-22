"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import {
  ApiError,
  fetchAccountDeletionRequest,
  requestAccountDeletion,
} from "@/lib/api";

export default function AccountPage() {
  const { user, isReady, error: sessionError, refresh } = useAuthSession();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const deletionQuery = useQuery({
    queryKey: ["account-deletion-request"],
    queryFn: fetchAccountDeletionRequest,
    enabled: isReady && Boolean(user),
  });
  const deletionMutation = useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: (request) => {
      queryClient.setQueryData(["account-deletion-request"], request);
      setConfirmed(false);
      setError("");
    },
    onError: (requestError) => {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't submit your request. Please try again.",
      );
    },
  });

  if (!isReady) {
    return (
      <main className="page-shell flex-1 py-10">
        <div className="grid min-h-64 place-items-center text-sm text-[var(--muted)]">
          Checking your account…
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell flex-1 py-12">
        <section className="mx-auto max-w-xl rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold">
            {sessionError
              ? "Could not check your sign-in"
              : "Sign in to your account"}
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {sessionError ??
              "Sign in to view your profile and account settings."}
          </p>
          {sessionError ? (
            <button
              className="primary-action mt-6 rounded-lg px-4 py-2 text-xs font-semibold text-white"
              onClick={() => void refresh()}
              type="button"
            >
              Try again
            </button>
          ) : (
            <Link
              className="primary-action mt-6 inline-flex rounded-lg px-4 py-2 text-xs font-semibold text-white"
              href="/login"
            >
              Sign in
            </Link>
          )}
        </section>
      </main>
    );
  }

  const deletionRequest = deletionQuery.data;

  return (
    <main className="page-shell flex-1 py-8 sm:py-12">
      <header className="mb-8">
        <p className="eyebrow mb-2">ACCOUNT SETTINGS</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your account
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage your profile, collections, and privacy choices.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AccountSidebar />
        <div className="grid gap-6">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
                <UserRound aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Profile</h2>
                <p className="text-xs text-[var(--muted)]">
                  Your SWEPack account details.
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--surface-muted)] p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Name
                </dt>
                <dd className="mt-1 text-sm font-semibold">{user.name}</dd>
              </div>
              <div className="rounded-lg bg-[var(--surface-muted)] p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Email
                </dt>
                <dd className="mt-1 break-all text-sm font-semibold">
                  {user.email ?? "Not provided"}
                </dd>
              </div>
              <div className="rounded-lg bg-[var(--surface-muted)] p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Account type
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {user.role === "ADMIN" ? "Administrator" : "Member"}
                </dd>
              </div>
              <div className="rounded-lg bg-[var(--surface-muted)] p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  GitHub
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {user.githubConnected ? "Connected" : "Not connected"}
                </dd>
              </div>
            </dl>
          </section>

          <section
            className="scroll-mt-24 rounded-xl border border-red-200 bg-[var(--surface)] p-6 sm:p-8"
            id="delete-account"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-red-700"
                size={19}
              />
              <div>
                <h2 className="text-lg font-bold text-red-800">
                  Request account deletion
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  This submits a request for review; it does not delete your
                  account immediately. Your account remains active until the
                  review is complete. Read the{" "}
                  <Link
                    className="font-semibold text-[var(--blue)]"
                    href="/privacy"
                  >
                    privacy information
                  </Link>{" "}
                  before proceeding.
                </p>
              </div>
            </div>

            {deletionQuery.isPending ? (
              <p className="mt-5 text-sm text-[var(--muted)]" role="status">
                Checking request status…
              </p>
            ) : deletionQuery.isError ? (
              <p className="mt-5 text-sm text-red-700" role="alert">
                We couldn&apos;t check your request status. Refresh the page to
                try again.
              </p>
            ) : deletionRequest ? (
              <div
                className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
                role="status"
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                  size={17}
                />
                <p>
                  Your request is{" "}
                  {deletionRequest.status.toLowerCase().replace("_", " ")}. No
                  account data has been deleted. Submitted{" "}
                  {new Date(deletionRequest.requestedAt).toLocaleDateString(
                    "en-US",
                    { timeZone: "UTC" },
                  )}
                  .
                </p>
              </div>
            ) : (
              <form
                className="mt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError("");
                  deletionMutation.mutate();
                }}
              >
                <label className="flex items-start gap-3 text-sm leading-6">
                  <input
                    checked={confirmed}
                    className="mt-1 accent-[var(--blue)]"
                    onChange={(event) => setConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I understand this submits an account deletion request for
                    review and does not delete my account immediately.
                  </span>
                </label>
                {error && (
                  <p className="mt-3 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="mt-5 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!confirmed || deletionMutation.isPending}
                  type="submit"
                >
                  {deletionMutation.isPending
                    ? "Submitting request…"
                    : "Submit deletion request"}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
