// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { myProfile } from "../services/user"; // should return your profile JSON

// ---------- helpers (place above the component) ----------
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
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    myProfile()
      .then((res) => {
        if (!alive) return;
        setApiData(res || null);
      })
      .catch((e) => {
        if (!alive) return;
        setApiData(null);
        setError(e?.message || "Failed to load profile");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  // Merge session user with API (API values only override if non-empty)
  const profile = useMemo(
    () => ({ ...(user || {}), ...nonEmptyOnly(apiData) }),
    [user, apiData]
  );

  // ---- Normalize & pick required fields (prefer API->user fallbacks) ----
  const name = firstNonEmpty(
    apiData?.name, user?.name,
    profile.fullName, profile.username, profile.userName
  );

  const department = firstNonEmpty(
    apiData?.department, user?.department,
    profile.dept, profile.team
  );

  const contactNo = firstNonEmpty(
    apiData?.contactNo, user?.contactNo,
    apiData?.phone, user?.phone,
    apiData?.mobile, user?.mobile,
    apiData?.phoneNumber, user?.phoneNumber,
    apiData?.contact, user?.contact
  );

  // address can be a string or an object with parts
  const address = useMemo(() => {
    // Prefer API address if meaningful, otherwise user address
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

  const pincode = firstNonEmpty(
    apiData?.pincode, user?.pincode,
    apiData?.pinCode, user?.pinCode,
    apiData?.postalCode, user?.postalCode,
    apiData?.postcode, user?.postcode,
    apiData?.zip, user?.zip,
    apiData?.zipcode, user?.zipcode
  );

  const designation = firstNonEmpty(
    apiData?.designation, user?.designation, profile.designation, profile.title
  );

  const email = firstNonEmpty(
    apiData?.email, user?.email, profile.userEmail
  );

  // small field renderer (always shows the row, even if blank)
  const Row = ({ label, value }) => (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{value ?? ""}</dd>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <img
          src={
            profile.avatarUrl ||
            "https://png.pngtree.com/png-vector/20191110/ourmid/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_1978396.jpg"
          }
          alt="Avatar"
          className="h-16 w-16 rounded-full object-cover"
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-blue-950">
            {name || "My Profile"}
          </h1>
          {email && <div className="text-sm text-gray-600">{email}</div>}
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border-2 border-gray-300 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-300 bg-gray-50">
          <div className="font-medium text-gray-800">Profile Information</div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <Row label="Name" value={name} />
            <Row label="Department" value={department} />
            <Row label="Contact No" value={contactNo} />
            <Row label="Address" value={address} />
            <Row label="Pincode" value={pincode} />
            <Row label="Designation" value={designation} />
            <Row label="Email" value={email} />
          </dl>
        </div>
      </div>
    </div>
  );
}
