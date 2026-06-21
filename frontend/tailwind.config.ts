import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep emotional nightscape — intentful dark, not generic SaaS dark.
        night: { DEFAULT: "#06060d", 900: "#08080f", 800: "#0c0c18", 700: "#141426" },
        emotion: "var(--emotion)",
        ink: "#ECECF2",
        dim: "#9a9aac",
        faint: "#6b6b7b",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        glow: "0 0 50px -10px var(--emotion)",
        "glow-sm": "0 0 22px -6px var(--emotion)",
        panel: "0 30px 80px -40px rgba(0,0,0,0.9)",
      },
      keyframes: {
        breathe: {
          "0%,100%": { transform: "scale(1)", opacity: "0.92" },
          "50%": { transform: "scale(1.14)", opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        twinkle: {
          "0%,100%": { opacity: "0.15" },
          "50%": { opacity: "0.85" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        breathe: "breathe 4.5s ease-in-out infinite",
        floaty: "floaty 7s ease-in-out infinite",
        twinkle: "twinkle 3.2s ease-in-out infinite",
        rise: "rise 0.6s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
