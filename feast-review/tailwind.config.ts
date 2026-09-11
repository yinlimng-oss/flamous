import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16181d",
        "ink-muted": "#6b6a64",
        paper: "#f3f1ec",
        surface: "#ffffff",
        border: "#e4e1d9",
        primary: { DEFAULT: "#2f5d50", hover: "#24473d" },
        gold: "#e3a33e",
        brick: "#b3412c",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        ui: ["Inter", "sans-serif"],
      },
      borderRadius: { admin: "10px" },
    },
  },
  plugins: [],
};

export default config;
