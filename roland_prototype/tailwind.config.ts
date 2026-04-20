import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1411",
        moss: {
          50: "#F2F7F1",
          100: "#DDEBD9",
          200: "#BBD7B3",
          300: "#8FBC85",
          400: "#5E9A55",
          500: "#3D7A36",
          600: "#2C5C28",
          700: "#234820",
          800: "#1B3719",
          900: "#0F2310",
        },
        clay: {
          50: "#FBF6EF",
          100: "#F4E8D6",
          200: "#E9D2AE",
          300: "#D9B47E",
          400: "#C28F4E",
          500: "#A36F30",
          600: "#7E5424",
        },
        sky: {
          accent: "#4FA3D1",
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 35, 16, 0.08)",
        glow: "0 0 0 4px rgba(143, 188, 133, 0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        float: "float 4s ease-in-out infinite",
        pulseRing: "pulseRing 1.8s ease-out infinite",
        slideUp: "slideUp 0.45s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
