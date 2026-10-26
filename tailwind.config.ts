import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // TKG corporate direction: red primary, deep navy supporting, white/light gray surfaces.
        brand: {
          50: "#fef2f2",
          100: "#fde3e3",
          200: "#fbcaca",
          500: "#d71920",
          600: "#c0141b",
          700: "#9f1117",
        },
        navy: {
          50: "#f2f5f9",
          100: "#e3e9f1",
          200: "#c5d1e0",
          400: "#6b7f9c",
          600: "#2c4266",
          700: "#1f3152",
          800: "#16243f",
          900: "#0f1a2e",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "Noto Sans KR",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
