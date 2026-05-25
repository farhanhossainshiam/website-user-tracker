const COLORS = [
  "#6c63ff", "#ff6b6b", "#2ed573", "#ffa502", "#1e90ff",
  "#ff4757", "#3742fa", "#2f3542", "#a55eea", "#ff6348",
  "#1abc9c", "#e056fd", "#7bed9f", "#70a1ff", "#eccc68",
];

export function getAvatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function getInitials(email: string): string {
  const lower = email.toLowerCase().trim();
  const namePart = lower.split("@")[0];
  const parts = namePart.split(/[._-]/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return namePart.slice(0, 2).toUpperCase();
}