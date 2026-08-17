import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
          faint: "#94A3B8",
        },
        stone: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
        },
        pulse: {
          DEFAULT: "#2563EB",
          bright: "#3B82F6",
          soft: "#EFF6FF",
          deep: "#1D4ED8",
        },
        success: {
          DEFAULT: "#16A34A",
          soft: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#F59E0B",
          soft: "#FFFBEB",
          deep: "#B45309",
        },
        danger: {
          DEFAULT: "#DC2626",
          soft: "#FEF2F2",
        },
        surface: "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)",
        lift: "0 16px 40px rgba(15,23,42,0.10)",
        glow: "0 0 0 4px rgba(37,99,235,0.12)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(ellipse 80% 55% at 85% -10%, rgba(37,99,235,0.18), transparent 55%), linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
