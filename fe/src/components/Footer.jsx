// src/components/Footer.jsx
import React from "react";
import { C_NIGHT, C_CHAR, C_SLATE, C_CLOUD } from "../theme/palette";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="border-t"
      style={{
        background: C_NIGHT,   // dark footer
        borderColor: C_CLOUD, // subtle divider
        color: C_CLOUD,       // light text
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 text-center text-sm opacity-90">
        © {year} Reimbursement App. All rights reserved.
      </div>
    </footer>
  );
}
