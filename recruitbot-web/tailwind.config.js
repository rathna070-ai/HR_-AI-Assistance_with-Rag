import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // RecruitBot brand
        primary: "#6366f1",
        accent: "#ec4899",
        // Backgrounds
        "bg-base": "#0f0f13",
        "bg-surface": "#18181f",
        "bg-card": "#1e1e28",
        // Text
        "text-primary": "#f1f1f5",
        "text-muted": "#8b8ba0",
        // Search mode scores
        "score-vector": "#818cf8",
        "score-bm25": "#f472b6",
        "score-hybrid": "#34d399",
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
