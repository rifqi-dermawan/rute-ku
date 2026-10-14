/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"] as unknown as "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0B6E78",
          dark: "#084F57",
          tint: "#E3F2F3",
        },
        secondary: "#12385C",
        success: "#15803D",
        warning: "#845309",
        error: "#B42318",
        info: "#0369A1",
        ink: "#0F2A33",
        muted: "#4A6068",
        surface: "#F4F9FA",
        borderCol: "#D6E4E8",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        input: "8px",
        seat: "12px",
        card: "16px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
