"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      addToast("error", "Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      addToast("error", authError.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      addToast("info", "Check your email to confirm your account, then login.");
      setLoading(false);
      return;
    }

    if (data.session) {
      await supabase.from("Profile").upsert({
        userId: data.user!.id,
        email,
        role: "user",
      });
      addToast("success", "Account created! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
      return;
    }

    // No session, no user object — email was sent (or re-sent) for confirmation
    addToast("info", "Check your email to confirm your account, then login.");
    setLoading(false);
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Create Account</h1>
          <p className="text-[var(--text-secondary)] mt-1">Sign up to start shortening links</p>
        </div>

        <form onSubmit={handleSubmit} className="neu-card">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="neu-input" placeholder="you@example.com" required />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="neu-input" placeholder="Min 6 characters" required minLength={6} />
          </div>

          <button type="submit" disabled={loading} className="neu-primary-btn w-full">
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--primary)] font-semibold hover:underline">Login</Link>
          </p>
        </form>
      </div>
      </main>
    </div>
  );
}
