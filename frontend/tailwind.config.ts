import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Token semantik — komponen hanya boleh memakai token ini (DESIGN.md §2).
      // Nilai mentah didefinisikan sebagai CSS var oklch di app/globals.css.
      colors: {
        page: "var(--bg-page)",
        surface: "var(--bg-surface)",
        muted: "var(--bg-muted)",
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          text: "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
          text: "var(--warning-text)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
          text: "var(--danger-text)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
          text: "var(--info-text)",
        },
        // Ramp brand mentah (oklch) — hanya untuk kasus khusus, bukan komponen biasa.
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Skala DESIGN.md §3: 12 / 13 / 14 / 16 / 20 / 24 / 30
        13: ["13px", { lineHeight: "1.5rem" }],
      },
      borderRadius: {
        // Radius concentric (better-ui): kartu 14px, kontrol 10px, badge 999px.
        card: "14px",
        control: "10px",
      },
      keyframes: {
        // Entrance halus dashboard: stagger ~100ms, hanya saat pertama load.
        "fade-slide-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-slide-in": "fade-slide-in 0.45s cubic-bezier(0.2, 0, 0, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
