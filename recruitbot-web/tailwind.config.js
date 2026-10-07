import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // TalentLens AI brand
        navy: "#0B1F3A",
        primary: "#2563EB",
        accent: "#6366F1",
        success: "#10B981",
        line: "#E2E8F0",
        // Backgrounds
        "bg-base": "#F8FAFC",
        "bg-surface": "#FFFFFF",
        "bg-card": "#FFFFFF",
        // Text
        "text-primary": "#0F172A",
        "text-muted": "#64748B",
        // Search mode colours. "ink" is a darker shade of the same hue for text
        // on light backgrounds (WCAG AA contrast).
        "score-ai": { DEFAULT: "#7C3AED", ink: "#6D28D9" },
        "score-vector": { DEFAULT: "#6366F1", ink: "#4338CA" },
        "score-bm25": { DEFAULT: "#2563EB", ink: "#1D4ED8" },
        "score-hybrid": { DEFAULT: "#10B981", ink: "#047857" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulse: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
        bounce: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "0%": { backgroundPosition: "-200%" }, "100%": { backgroundPosition: "200%" } },
      },
      animation: {
        "status-pulse": "pulse 2s ease-in-out infinite",
        "dot-bounce": "bounce 0.6s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite linear",
      },
    },
  },
  plugins: [animate],
};
