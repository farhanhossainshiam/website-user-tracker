"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (!session) {
        addToast("error", "Invalid or expired reset link. Please request a new one.");
        router.push("/forgot-password");
        return;
      }
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      addToast("error", "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      addToast("error", "Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      addToast("error", error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    addToast("success", "Password updated successfully!");
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center neu-bg">
        <div className="neu-convex w-16 h-16 rounded-2xl flex items-center justify-center">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-[var(--text)]">Set New Password</h1>
            <p className="text-[var(--text-secondary)] mt-1">Choose a new password for your account</p>
          </div>

          {done ? (
            <div className="neu-card text-center py-8">
              <div className="neu-convex w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[var(--text)] font-semibold mb-1">Password updated!</p>
              <p className="text-sm text-[var(--text-secondary)]">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="neu-card">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="neu-input" placeholder="Min 6 characters" required minLength={6} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="neu-input" placeholder="Re-enter password" required minLength={6} />
              </div>

              <button type="submit" disabled={loading} className="neu-primary-btn w-full">
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
