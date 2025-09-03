// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // use .dark on <html> or <body>
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* --- Semantic colors pulled from your OKLCH CSS variables --- */
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",

        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",

        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",

        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",

        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",

        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",

        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",

        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        // Charts
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",

        // Sidebar system
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-primary": "var(--sidebar-primary)",
        "sidebar-primary-foreground": "var(--sidebar-primary-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-ring": "var(--sidebar-ring)",

        /* --- Legacy green palette (kept for back-compat) --- */
        night: { 900: "#0F2E2A" },
        gun: { 800: "#e6d4ae" },
        char: { 700: "#2F6F5E" },
        slate: { 600: "#B7E4C7" },
        steel: { 300: "#ECFDF5" },
        cloud: { 200: "#F5F0E6" },
        cardLegacy: { 100: "#e6d4ae" },

        // Aliases
        coffee: { 900: "#0F2E2A" },
        cocoa: { 600: "#e6d4ae" },
        taupe: { 400: "#2F6F5E" },
        linen: { 300: "#ECFDF5" },
        eggshell: { 200: "#F5F0E6" },
      },

      /* --- Radius mapped to your CSS variable scale --- */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        xl2: "1.25rem", // legacy custom size, keep if you used it
      },

      /* --- Shadows pulled from your CSS variables --- */
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        soft: "0 10px 24px rgba(15, 46, 42, .12)",
        inset: "inset 0 1px 0 rgba(255,255,255,.25)",
      },

      
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        brand: ['"Quintessential"', "serif"],
        jakarta: ['"Plus Jakarta Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
