// src/components/Footer.jsx
import React from "react";
import { C_NIGHT, C_CLOUD } from "../theme/palette";

const FOOTER_HEIGHT = 56; // px (keep in sync with Login.jsx)

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="border-t"
      style={{
        background: "#F5F0E6",
        borderColor: C_CLOUD,
        color: C_NIGHT,
        height: FOOTER_HEIGHT,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-center text-center text-sm opacity-90 font-bold">
        © {year} Reimbursement App. All rights reserved.
      </div>
    </footer>
  );
}
