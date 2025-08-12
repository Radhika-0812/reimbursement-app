import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName:"", lastName:"", dob:"", doj:"",
    department:"", manager:"", // manager email recommended
    role:"employee", contact:"", address:"", pincode:"",
    email:"", password:"",
  });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setErr("");
    try {
      await signup(form);
      navigate("/login"); // back to login after creating account
    } catch (e) { setErr(e.message || "Signup failed"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl bg-white border rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold text-blue-950">Create account</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in your details to create an account.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" name="firstName" value={form.firstName} onChange={onChange} required />
            <Input label="Last Name" name="lastName" value={form.lastName} onChange={onChange} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input type="date" label="Date of Birth" name="dob" value={form.dob} onChange={onChange} required />
            <Input type="date" label="Date of Joining" name="doj" value={form.doj} onChange={onChange} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Department" name="department" value={form.department} onChange={onChange} required />
            <Input label="Manager (email)" name="manager" value={form.manager} onChange={onChange} required />
          </div>

          <Select label="Role" name="role" value={form.role} onChange={onChange}
            options={[{value:"employee",label:"Employee"},{value:"manager",label:"Manager"},{value:"finance",label:"Finance"},{value:"admin",label:"Admin"}]} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input type="tel" label="Contact" name="contact" value={form.contact} onChange={onChange} required />
            <Input type="text" label="Pincode" name="pincode" value={form.pincode} onChange={onChange} required />
          </div>

          <Textarea label="Address" name="address" value={form.address} onChange={onChange} required />
          <Input type="email" label="Email ID" name="email" value={form.email} onChange={onChange} required />

          <label className="block text-sm">
            <span className="text-gray-700">Password</span>
            <div className="mt-1 flex">
              <input type={showPw ? "text" : "password"} name="password" value={form.password} onChange={onChange}
                required minLength={6}
                className="w-full rounded-l-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="px-3 border border-l-0 rounded-r-md text-sm text-gray-600 hover:bg-gray-50">
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button type="submit" className="w-full rounded-md bg-blue-950 text-white py-2 hover:bg-blue-900">Sign up</button>

          <div className="text-sm text-center text-gray-600">
            Already have an account? <Link to="/login" className="text-blue-700 hover:underline">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange, type="text", required }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <input type={type} name={name} value={value} onChange={onChange} required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
    </label>
  );
}
function Textarea({ label, name, value, onChange, required }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <textarea name={name} value={value} onChange={onChange} rows={3} required={required}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
    </label>
  );
}
function Select({ label, name, value, onChange, options }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <select name={name} value={value} onChange={onChange}
        className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
