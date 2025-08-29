// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* New palette (dark → light) */
        night: { 900: "#06141B" },
        gun:   { 800: "#11212D" },
        char:  { 700: "#253745" },
        slate: { 600: "#445C6A" },
        steel: { 300: "#9BA8AB" },
        cloud: { 200: "#CCD0CF" },

        /* Back-compat aliases → map old names to new shades */
        coffee:   { 900: "#06141B" }, // was #291C0E
        cocoa:    { 600: "#253745" },
        taupe:    { 400: "#445C6A" },
        linen:    { 300: "#9BA8AB" },
        eggshell: { 200: "#CCD0CF" },
      },
      boxShadow: {
        soft: "0 10px 24px rgba(6, 20, 27, .12)", // based on night
        inset: "inset 0 1px 0 rgba(255,255,255,.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
