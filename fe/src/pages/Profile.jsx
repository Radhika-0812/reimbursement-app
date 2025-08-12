import React from "react";
import { useAuth } from "../state/AuthContext";
import NavBar from "../components/NavBar";

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div>
        <NavBar />
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-blue-950 mb-4">My Profile</h1>
      <div className="bg-white border rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Item k="Name" v={user.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()} />
        <Item k="Email" v={user.email} />
        <Item k="Role" v={user.role} />
        <Item k="Department" v={user.department} />
        <Item k="Manager" v={user.manager} />
        <Item k="Contact" v={user.contact} />
        <Item k="Address" v={user.address} />
        <Item k="Pincode" v={user.pincode} />
        <Item k="Date of Birth" v={user.dob} />
        <Item k="Date of Joining" v={user.doj} />
      </div>
    </div>
    </div>
  );
}
function Item({ k, v }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{k}</div>
      <div className="text-sm font-medium text-gray-900">{v || "-"}</div>
    </div>
  );
}
