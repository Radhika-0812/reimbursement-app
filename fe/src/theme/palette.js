// src/theme/palette.js
// Theme-aware tokens: prefer OKLCH CSS variables, fall back to your green hexes.
// Using CSS var fallback keeps these dynamic (they react to .dark mode too).

// Surfaces
export const C_CARD  = "var(--card, #e6d4ae)";     // soft card bg
export const C_CLOUD = "var(--sidebar-accent, #F5F0E6)"; // light panel / subtle bg
export const C_STEEL = "var(--border, #ECFDF5)";   // borders / subtle lines

// Text
export const C_TEXT      = "var(--foreground, #C8A951)"; // main text color (was custom)
export const C_EGGSHELL  = "var(--card-foreground, #F5F0E6)"; // text on dark surfaces

// Brand / accents
export const C_GUN   = "var(--primary, #174C3C)";         // primary buttons / accents
export const C_CHAR  = "var(--accent, #2F6F5E)";          // secondary accents
export const C_SLATE = "var(--sidebar-border, #B7E4C7)";  // rings / hover lines

// Dark header / sidebar tone
export const C_NIGHT = "var(--sidebar-primary, #0F2E2A)"; // dark header / bars

// Legacy names (aliases) mapped to the tokens above for back-compat
export const C_OFFEE    = C_NIGHT; // headings, dark header
export const C_COCOA    = C_GUN;   // primary buttons
export const C_TAUPE    = C_CHAR;  // secondary accents
export const C_LINEN    = C_STEEL; // borders
// NOTE: C_EGGSHELL already defined as "light text on dark"

export default {
  C_NIGHT, C_GUN, C_CHAR, C_SLATE, C_STEEL, C_CLOUD, C_CARD, C_TEXT,
  C_OFFEE, C_COCOA, C_TAUPE, C_LINEN, C_EGGSHELL,
};
