import type { Config } from "tailwindcss";

// Design tokens live as CSS variables in globals.css; Tailwind just maps names to them.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        raised: token("raised"),
        line: token("line"),
        "line-strong": token("line-strong"),
        ink: token("ink"),
        muted: token("muted"),
        subtle: token("subtle"),
        accent: token("accent"),
        ok: token("ok"),
        warn: token("warn"),
        err: token("err"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
