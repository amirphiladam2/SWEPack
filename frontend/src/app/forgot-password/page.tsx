"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  PASSWORD_RESET_ENABLED,
  requestPasswordReset,
} from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");
    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't process that request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!PASSWORD_RESET_ENABLED) {
    return (
      <main className="mx-auto w-full max-w-[520px] flex-1 px-5 py-12 sm:px-8 sm:py-20">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Password recovery is temporarily unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            You can still sign in with your current password. Please try
            password recovery again later.
          </p>
          <Link
            className="mt-6 block text-center text-xs font-semibold text-[var(--blue)]"
            href="/login"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[520px] flex-1 px-5 py-12 sm:px-8 sm:py-20">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Enter your email and we&apos;ll send password-reset instructions if an account exists.
        </p>
        <form className="mt-6" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-xs font-semibold">
            Email
            <input
              className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {message && <p className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-700" role="status">{message}</p>}
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
          <button className="mt-6 h-10 w-full rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:opacity-90" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset instructions"}
          </button>
        </form>
        <Link className="mt-4 block text-center text-xs font-semibold text-[var(--blue)]" href="/login">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
