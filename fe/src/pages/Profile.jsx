// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { myProfile } from "../services/user";

function nonEmptyOnly(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}
function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    return v;
  }
  return "";
}

export default function Profile() {
  const { user, token } = useAuth();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!token) { setLoading(false); return; }
    setLoading(true); setError("");
    myProfile()
      .then((res) => { if (alive) setApiData(res || null); })
      .catch((e) => { if (alive) { setApiData(null); setError(e?.message || "Failed to load profile"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const profile = useMemo(() => ({ ...(user || {}), ...nonEmptyOnly(apiData) }), [user, apiData]);

  const name = firstNonEmpty(apiData?.name, user?.name, profile.fullName, profile.username, profile.userName);
  const department  = firstNonEmpty(apiData?.department, user?.department, profile.dept, profile.team);
  const contactNo   = firstNonEmpty(apiData?.contactNo, user?.contactNo, apiData?.phone, user?.phone, apiData?.mobile, user?.mobile, apiData?.phoneNumber, user?.phoneNumber, apiData?.contact, user?.contact);
  const address = useMemo(() => {
    const candidate = firstNonEmpty(apiData?.address, user?.address, profile.address);
    if (typeof candidate === "string") return candidate;
    const a = candidate && typeof candidate === "object" ? candidate : {};
    const parts = [
      a.line1 ?? a.addressLine1 ?? profile.addressLine1,
      a.line2 ?? a.addressLine2 ?? profile.addressLine2,
      a.city ?? profile.city,
      a.state ?? a.region ?? profile.state ?? profile.region,
      a.country ?? profile.country,
    ];
    return parts.filter(Boolean).join(", ");
  }, [apiData, user, profile]);
  const pincode     = firstNonEmpty(apiData?.pincode, user?.pincode, apiData?.pinCode, user?.pinCode, apiData?.postalCode, user?.postalCode, apiData?.postcode, user?.postcode, apiData?.zip, user?.zip, apiData?.zipcode, user?.zipcode);
  const designation = firstNonEmpty(apiData?.designation, user?.designation, profile.designation, profile.title);
  const email       = firstNonEmpty(apiData?.email, user?.email, profile.userEmail);

  const Row = ({ label, value }) => (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide" style={{ color: "color-mix(in oklch, var(--foreground) 60%, transparent)" }}>{label}</dt>
      <dd className="text-sm break-words">{value ?? ""}</dd>
    </div>
  );

  return (
    <div className="space-y-6" style={{ color: "var(--foreground)", background: "var(--background)" }}>
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{name || "My Profile"}</h1>
          {email && <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>{email}</div>}
        </div>
      </div>

      <div className="rounded-[1.25rem] border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b"
             style={{ borderColor: "var(--border)", background: "var(--sidebar)", color: "BLACK" }}>
          <div className="font-medium">Profile Information</div>
          <button onClick={() => window.location.reload()} className="text-sm px-3 py-1.5 rounded-md"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: loading ? 0.9 : 1 }}
                  disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 text-sm rounded-md px-3 py-2 border"
                 style={{ color: "var(--destructive-foreground)", background: "color-mix(in oklch, var(--destructive) 15%, white)", borderColor: "var(--destructive)" }}>
              {error}
            </div>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <Row label="Name"        value={name} />
            <Row label="Department"  value={department} />
            <Row label="Contact No"  value={contactNo} />
            <Row label="Address"     value={address} />
            <Row label="Pincode"     value={pincode} />
            <Row label="Designation" value={designation} />
            <Row label="Email"       value={email} />
          </dl>
        </div>
      </div>
    </div>
  );
}
