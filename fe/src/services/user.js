// src/services/users.js
import { http } from "./http";

// Try a few common endpoints; stop at the first one that succeeds.
export async function myProfile() {
  const candidates = ["/api/users/me", "/api/me", "/api/auth/me", "/api/profile/me"];
  let lastErr;
  for (const url of candidates) {
    try {
      const res = await http(url, { method: "GET" });
      if (res) return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Profile endpoint not found");
}
