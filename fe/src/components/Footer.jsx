// src/components/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-blue-950 text-white py-4 mt-10">
      <div className="container mx-auto text-center text-sm">
        <p>© {new Date().getFullYear()} Reimbursement App. All rights reserved.</p>
        
      </div>
    </footer>
  );
}
