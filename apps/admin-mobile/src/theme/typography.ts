export const typography = {
  family: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  size: {
    xs: 10, sm: 12, body: 14, label: 15, title: 21, display: 34,
  },
  lineHeight: {
    body: 21, compact: 16, heading: 26,
  },
  numeric: {
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.25,
  },
} as const;
