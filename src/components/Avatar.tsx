"use client";

import { getAvatarColor, getInitials } from "@/lib/avatar";

export function Avatar({ email, size = 36, tooltip }: { email: string; size?: number; tooltip?: boolean }) {
  const color = getAvatarColor(email);
  const initials = getInitials(email);
  const fontSize = size * 0.42;

  const inner = (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        color: "#fff",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.5px",
      }}
    >
      {initials}
    </div>
  );

  if (tooltip) {
    return (
      <div className="avatar-tooltip-wrapper">
        {inner}
        <span className="avatar-tooltip">{email}</span>
      </div>
    );
  }

  return inner;
}