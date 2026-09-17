import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pitch: {
          50: "#f0f3fa",
          100: "#dce3f0",
          200: "#b8c7e0",
          300: "#8fa4c9",
          400: "#6681b2",
          500: "#3d5e9b",
          600: "#1e3a6e",
          700: "#182f58",
          800: "#132545",
          900: "#0e1c35",
        },
        cw: {
          red: "#9B1B30",
          "red-light": "#f3e0e4",
          "red-dark": "#7a1526",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
      },
      animation: {
        "press": "press 0.15s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "shake": "shake 0.4s ease-out",
      },
      keyframes: {
        press: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
