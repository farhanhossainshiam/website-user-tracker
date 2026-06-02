"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://womist.pro";

export default function ForgotPasswordPage() {
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${BASE_URL}/auth/callback?next=/reset-password`,
    });

    if (error) {
      addToast("error", error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    addToast("success", "Reset link sent! Check your email.");
  };

  return (
    <div className="min-h-screen flex flex-col neu-bg">
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition duration-200">
          <div className="neu-convex w-10 h-10 rounded-2xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
            Womist<span className="text-[var(--primary)]"> Short</span>
          </h1>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="animate-fade-in w-full max-w-md">
          <div className="text-center mb-8">
            <div className="neu-convex w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Reset Password</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              {sent ? "Check your email for the reset link" : "Enter your email to receive a reset link"}
            </p>
          </div>

          {sent ? (
            <div className="neu-card text-center py-8">
              <div className="neu-convex w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[var(--text)] font-semibold mb-2">Email sent to {email}</p>
              <p className="text-sm text-[var(--text-secondary)] mb-6">Click the link in your email to reset your password.</p>
              <button onClick={() => setSent(false)} className="neu-btn px-6 py-2 text-sm font-semibold text-[var(--text-secondary)]">
                Try another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="neu-card">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="neu-input" placeholder="you@example.com" required />
              </div>

              <button type="submit" disabled={loading} className="neu-primary-btn w-full">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
                <Link href="/login" className="text-[var(--primary)] font-semibold hover:underline">Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
