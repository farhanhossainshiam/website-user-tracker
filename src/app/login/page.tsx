"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { ThemeToggle } from "@/components/ThemeProvider";

function LoginForm() {
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("banned")) {
      addToast("error", "Your account has been banned for violating our terms and conditions.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      addToast("error", authError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("Profile").upsert({
        userId: user.id,
        email: user.email || email,
        role: "user",
      });
    }

    addToast("success", "Signed in successfully!");
    window.location.href = "/dashboard";
  };

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="text-center mb-8">
        <div className="neu-convex w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Welcome Back</h1>
        <p className="text-[var(--text-secondary)] mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="neu-card">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="neu-input" placeholder="you@example.com" required />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 ml-1">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="neu-input" placeholder="********" required />
        </div>

        <button type="submit" disabled={loading} className="neu-primary-btn w-full">
          {loading ? "Signing in..." : "Sign In"}
        </button>

          <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[var(--primary)] font-semibold hover:underline">Register</Link>
          </p>
          <p className="text-center mt-2 text-sm">
            <Link href="/forgot-password" className="text-[var(--text-secondary)] hover:underline">Forgot password?</Link>
          </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
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
        <Suspense fallback={<div className="text-[var(--text-secondary)]">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
