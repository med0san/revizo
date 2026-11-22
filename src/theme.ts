import { useColorScheme } from "react-native";

export type Theme = {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  sub: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  good: string;
  warn: string;
  bad: string;
};

const light: Theme = {
  dark: false,
  bg: "#F5F4FA",
  card: "#FFFFFF",
  cardAlt: "#EEEBFB",
  text: "#17142B",
  sub: "#6B6785",
  border: "#E3E0F0",
  accent: "#6C4CF1",
  accentSoft: "#E9E3FF",
  onAccent: "#FFFFFF",
  good: "#1E9E62",
  warn: "#D98A00",
  bad: "#D93B3B",
};

const dark: Theme = {
  dark: true,
  bg: "#0F0D1A",
  card: "#1A1729",
  cardAlt: "#241F3A",
  text: "#F2F0FA",
  sub: "#A29DBD",
  border: "#2C2745",
  accent: "#8B70FF",
  accentSoft: "#2D2550",
  onAccent: "#FFFFFF",
  good: "#3CCB85",
  warn: "#F2B33D",
  bad: "#FF6B6B",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export function gradeColor(t: Theme, v: number | null | undefined) {
  if (v == null) return t.sub;
  if (v >= 14) return t.good;
  if (v >= 10) return t.warn;
  return t.bad;
}
