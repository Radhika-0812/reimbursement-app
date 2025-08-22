// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { myProfile } from "../services/user"; // keep your existing path

export default function Profile() {
  const { user, token } = useAuth();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    myProfile()
      .then((res) => { if (alive) setApiData(res || null); })
      .catch(() => { if (alive) setApiData(null); }) // silent fallback to session user
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // Merge API result over session user (API wins if provided)
  const profile = useMemo(() => ({ ...(user || {}), ...(apiData || {}) }), [user, apiData]);

  // Extract exactly the fields we need, with sensible fallbacks
  const name = profile.name ?? profile.fullName ?? profile.username ?? profile.email ?? "My Profile";
  const department = profile.department ?? profile.dept ?? profile.team ?? "";
  const username = profile.username ?? profile.userName ?? "";
  const email = profile.email ?? "";
  const phone = profile.phone ?? profile.mobile ?? profile.phoneNumber ?? "";

  const address = useMemo(() => {
    const a = profile.address;
    if (typeof a === "string") return a;
    if (a && typeof a === "object") {
      const parts = [
        a.line1 ?? a.addressLine1,
        a.line2 ?? a.addressLine2,
        a.city,
        a.state ?? a.region,
        a.postalCode ?? a.zip,
        a.country,
      ];
      return parts.filter(Boolean).join(", ");
    }
    const parts = [
      profile.addressLine1,
      profile.addressLine2,
      profile.city,
      profile.state ?? profile.region,
      profile.postalCode ?? profile.zip,
      profile.country,
    ];
    return parts.filter(Boolean).join(", ");
  }, [profile]);

  const Field = ({ label, value }) =>
    !value ? null : (
      <div className="flex flex-col">
        <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900 break-words">{value}</dd>
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
          <h1 className="text-xl sm:text-2xl font-semibold text-blue-950">{name}</h1>
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
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <Field label="Department" value={department} />
            <Field label="Username" value={username} />
            <Field label="Email" value={email} />
            <Field label="Address" value={address} />
            <Field label="Phone" value={phone} />
          </dl>
          {!department && !username && !email && !address && !phone && !loading && (
            <div className="text-sm text-gray-500">No profile details available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
