"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

export function UserMenu({ email, size = 32 }: { email: string; size?: number }) {
  const supabase = createBrowserClient();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "change" | "forgot">("menu");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { addToast("error", "Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { addToast("error", "Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { addToast("error", error.message); }
    else { addToast("success", "Password changed successfully!"); setOpen(false); setMode("menu"); setNewPassword(""); setConfirmPassword(""); }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    if (error) { addToast("error", error.message); }
    else { addToast("success", "Password reset email sent. Check your inbox."); setOpen(false); setMode("menu"); }
    setLoading(false);
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => { setOpen(!open); setMode("menu"); }}
        className="rounded-full focus:outline-none"
      >
        <Avatar email={email} size={size} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 neu-card !p-0 w-56 z-50 animate-fade-in">
          {mode === "menu" && (
            <>
              <div className="px-4 py-3 border-b border-[var(--shadow-dark)]/30">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{email}</p>
              </div>
              <button
                onClick={() => setMode("change")}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--shadow-dark)]/10 transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Change Password
              </button>
              <button
                onClick={() => setMode("forgot")}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--shadow-dark)]/10 transition-colors rounded-b-xl flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Forgot Password
              </button>
            </>
          )}

          {mode === "change" && (
            <div className="p-4">
              <p className="text-sm font-semibold text-[var(--text)] mb-3">Change Password</p>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="neu-input mb-2 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="neu-input mb-3 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={() => { setMode("menu"); setNewPassword(""); setConfirmPassword(""); }} className="neu-btn flex-1 py-2 text-xs font-semibold text-[var(--text-secondary)]">Back</button>
                <button onClick={handleChangePassword} disabled={loading} className="neu-primary-btn flex-1 !py-2 text-xs">{loading ? "Saving..." : "Save"}</button>
              </div>
            </div>
          )}

          {mode === "forgot" && (
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-[var(--text)] mb-2">Reset Password</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Send a password reset link to <span className="text-[var(--text)] font-semibold">{email}</span>?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setMode("menu")} className="neu-btn flex-1 py-2 text-xs font-semibold text-[var(--text-secondary)]">Back</button>
                <button onClick={handleForgotPassword} disabled={loading} className="neu-primary-btn flex-1 !py-2 text-xs">{loading ? "Sending..." : "Send"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
