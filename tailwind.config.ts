import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./packages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        "void-soft": "#030603",
        neon: "#39ff5a",
        "neon-dark": "#20ff46",
      },
      fontFamily: {
        mono: [
          "var(--font-geist-mono)",
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        neon: "0 0 24px rgba(57, 255, 90, 0.35)",
        "neon-soft": "0 0 48px rgba(32, 255, 70, 0.16)",
      },
      backgroundImage: {
        "neon-grid":
          "linear-gradient(rgba(57,255,90,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,90,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
