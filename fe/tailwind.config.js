// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Green palette (dark → light) */
        night: { 900: "#0F2E2A" },  // deep forest
        gun:   { 800: "#e6d4ae" },  // action green
        char:  { 700: "#2F6F5E" },  // dark emerald
        slate: { 600: "#B7E4C7" },  // mid green (rings / hovers)
        steel: { 300: "#ECFDF5" },  // mint border
        cloud: { 200: "#F5F0E6" },  // eggshell
        card:  { 100: "#e6d4ae" },  // soft card surface

        /* Back-compat aliases (old names → new shades) */
        coffee:   { 900: "#0F2E2A" }, // → night.900
        cocoa:    { 600: "#e6d4ae" }, // → gun.800
        taupe:    { 400: "#2F6F5E" }, // → char.700
        linen:    { 300: "#ECFDF5" }, // → steel.300
        eggshell: { 200: "#F5F0E6" }, // → cloud.200
      },
      boxShadow: {
        soft: "0 10px 24px rgba(15, 46, 42, .12)", // tinted from night
        inset: "inset 0 1px 0 rgba(255,255,255,.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      fontFamily: {
        brand: ['"Quintessential"', 'serif'], // use for logo/headings
      },
    },
  },
  plugins: [],
};
