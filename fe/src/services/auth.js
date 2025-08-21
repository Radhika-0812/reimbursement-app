// Auth calls: signup / signin / signout

import { http } from "./http";

export function signup(body) {
  // Backend expects strings for all fields; cast here
  const payload = {
    name: String(body.name ?? ""),
    department: String(body.department ?? ""),
    contact: String(body.contactNo ?? body.contact ?? ""),
    address: String(body.address ?? ""),
    pincode: String(body.pincode ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  };
  return http("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

export async function signin({ email, password }) {
  const data = await http("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: String(email ?? ""), password: String(password ?? "") }),
  });

  // Support multiple backend response shapes
  const token = (typeof data === "string")
    ? data
    : (data.accessToken || data.token || data.jwt || "");

  if (token) localStorage.setItem("token", token);
  return data;
}

export function signout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
