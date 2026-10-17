"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "This password reset link is missing its token.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token") ?? "";
    queueMicrotask(() => {
      setToken(nextToken);
      if (nextToken) setError("");
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await resetPassword(token, password);
      setMessage(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't reset your password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }

  }

  return (
    <main className="mx-auto w-full max-w-[520px] flex-1 px-5 py-12 sm:px-8 sm:py-20">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Choose a new password with at least 8 characters.</p>
        {message ? (
          <div className="mt-6">
            <p className="rounded-lg bg-green-50 p-3 text-xs text-green-700" role="status">{message}</p>
            <Link className="mt-4 block text-center text-xs font-semibold text-[var(--blue)]" href="/login">Go to sign in</Link>
          </div>
        ) : (
          <form className="mt-6" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-xs font-semibold">
              New password
              <input className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="mt-4 grid gap-2 text-xs font-semibold">
              Confirm new password
              <input className="h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--blue)]" type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            </label>
            {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
            <button className="mt-6 h-10 w-full rounded-lg bg-[var(--blue)] px-4 text-xs font-semibold text-white hover:bg-blue-700" disabled={isSubmitting || !token}>
              {isSubmitting ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
