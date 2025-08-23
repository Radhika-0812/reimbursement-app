// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { myProfile } from "../services/user"; // make sure this returns your profile JSON

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

  // Merge API result over session user (API wins)
  const profile = useMemo(() => ({ ...(user || {}), ...(apiData || {}) }), [user, apiData]);

  // ---- Normalize & pick required fields ----
  const name =
    profile.name ??
    profile.fullName ??
    profile.username ??
    profile.userName ??
    "";

  const department = profile.department ?? profile.dept ?? profile.team ?? "";

  const contactNo =
    profile.contactNo ??
    profile.phone ??
    profile.mobile ??
    profile.phoneNumber ??
    profile.contact ??
    "";

  // address can be a string or an object with parts
  const address = useMemo(() => {
    const a = profile.address;
    if (typeof a === "string") return a;
    const parts = a && typeof a === "object"
      ? [
          a.line1 ?? a.addressLine1,
          a.line2 ?? a.addressLine2,
          a.city,
          a.state ?? a.region,
          a.country,
        ]
      : [
          profile.addressLine1,
          profile.addressLine2,
          profile.city,
          profile.state ?? profile.region,
          profile.country,
        ];
    return parts.filter(Boolean).join(", ");
  }, [profile]);

  const pincode =
    profile.pincode ??
    profile.pinCode ??
    profile.postalCode ??
    profile.postcode ??
    profile.zip ??
    profile.zipcode ??
    "";

      

  const designation = profile.designation ?? profile.title ?? "";

  const email = profile.email ?? profile.userEmail ?? "";

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
