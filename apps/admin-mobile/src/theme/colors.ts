export const colors = {
  background: "#0B0911",
  surface: "#141119",
  elevated: "#1D1826",
  border: "rgba(241, 240, 232, 0.08)",
  text: "#F1F0E8",
  muted: "#A6A2B1",
  accent: "#D5EF86",
  purple: "#A58BD3",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  overlay: "rgba(5, 4, 8, 0.76)",
} as const;

export type ColorToken = keyof typeof colors;
