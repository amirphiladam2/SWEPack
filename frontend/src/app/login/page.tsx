"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { ApiError, fetchCurrentUser, login, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, isReady } = useAuthSession();
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled: isReady && Boolean(token),
    retry: false,
  });
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await register({ name, email, password });
        setMode("login");
        setSuccess("Account created. You can now sign in.");
        return;
      }

      const response = await login({ email, password });
      queryClient.setQueryData(["current-user"], response.user);
      router.push("/");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady || (token && currentUserQuery.isPending)) {
    return (
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
          Checking your account…
        </div>
      </main>
    );
  }

  if (currentUserQuery.data) {
    return (
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-xl rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">
            ACCOUNT
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            You’re already signed in
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Signed in as {currentUserQuery.data.email}.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:opacity-90"
              href="/"
            >
              Browse resources
            </Link>
            {currentUserQuery.data.role === "ADMIN" && (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)]"
                href="/admin"
              >
                Open admin console
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
        <Link href="/">Home</Link>
        <ChevronRight size={13} />
        <strong className="text-[var(--text)]">
          {mode === "login" ? "Sign in" : "Create account"}
        </strong>
      </div>
      <div className="grid items-start gap-10 py-12 lg:grid-cols-[1fr_420px] lg:py-20">
        <div className="max-w-lg">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue)]">
            WELCOME TO SWEPACK
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-[-0.06em] sm:text-5xl">
            Keep your best tools within reach.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[var(--muted)]">
            Sign in to save resources, build collections, and share the finds
            worth passing on.
          </p>
        </div>
        <form
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight">
              {mode === "login" ? "Sign in to SWEPack" : "Create your account"}
            </h2>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Sign in to save resources and submit resources for review.
            </p>
          </div>
          {mode === "register" && (
            <label className="mt-4 grid gap-2 text-xs font-semibold">
              Name
              <input
                className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
                name="name"
                required
                maxLength={100}
              />
            </label>
          )}
          <label className="mt-4 grid gap-2 text-xs font-semibold">
            Email
            <input
              className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="mt-4 grid gap-2 text-xs font-semibold">
            Password
            <input
              className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </label>
          {mode === "register" && (
            <label className="mt-4 grid gap-2 text-xs font-semibold">
              Confirm password
              <input
                className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          )}
          {token && currentUserQuery.error && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800" role="status">
              Your saved session is no longer valid. Please sign in again.
            </p>
          )}
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
          {success && <p className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-700" role="status">{success}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-xs font-semibold hover:bg-[var(--surface-muted)]" href="/">
              Back to resources
            </Link>
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:opacity-90" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </div>
          {mode === "login" && (
            <Link className="mt-4 block text-center text-xs font-semibold text-[var(--blue)]" href="/forgot-password">
              Forgot your password?
            </Link>
          )}
          <button
            className="mt-3 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setSuccess("");
            }}
          >
            {mode === "login"
              ? "Create a new account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
