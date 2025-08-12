import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useClaims } from "../state/ClaimsContext";
import NavBar from "../components/NavBar";

/** Category metadata + required docs (shown on the form) */
const CATEGORIES = [
  {
    id: "travel",
    title: "Travel Reimbursement",
    desc: "Flights, trains, cabs, mileage",
    requiredDocs: ["Tickets/Invoices", "Boarding pass (if flight)", "Payment proof"],
    fields: [
      { name: "tripFrom", label: "From" },
      { name: "tripTo", label: "To" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "mode", label: "Mode", type: "select", options: ["Flight", "Train", "Cab", "Own Vehicle"] },
    ],
  },
  {
    id: "food",
    title: "Food / Meals",
    desc: "Meals during official travel/work",
    requiredDocs: ["Restaurant bill", "Payment proof"],
    fields: [
      { name: "date", label: "Date", type: "date" },
      { name: "mealType", label: "Meal Type", type: "select", options: ["Breakfast", "Lunch", "Dinner", "Snacks"] },
    ],
  },
  {
    id: "medical",
    title: "Medical",
    desc: "Doctor fees, medicines, tests",
    requiredDocs: ["Prescription (if applicable)", "Bills/Invoices"],
    fields: [
      { name: "date", label: "Date", type: "date" },
      { name: "provider", label: "Hospital/Clinic" },
      { name: "type", label: "Type", type: "select", options: ["Consultation", "Medicine", "Lab Test", "Procedure"] },
    ],
  },
  {
    id: "misc",
    title: "Miscellaneous",
    desc: "Stationery, communication, others",
    requiredDocs: ["Bill/Invoice", "Payment proof"],
    fields: [
      { name: "date", label: "Date", type: "date" },
      { name: "purpose", label: "Purpose" },
    ],
  },
];

/** S3 upload stub: replace with your backend presign flow */
async function uploadToS3(file) {
  if (!file) return null;
  // TODO: call your backend for a presigned URL, then PUT the file.
  // Return the S3 key / URL to save in the claim payload.
  return `s3://your-bucket/${Date.now()}-${file.name}`;
}

export default function CreateClaim() {
  const [openId, setOpenId] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const navigate = useNavigate();

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));
  const selectCategory = (id) => {
    setSelected(id);
    setOpenId(id);
  };

  return (
    <div><NavBar />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-blue-950">Create Claim</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm px-3 py-1.5 rounded-md border text-blue-950 border-blue-200 hover:bg-blue-50"
        >
          ← Back
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories (accordion list) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  onClick={() => toggle(cat.id)}
                  aria-expanded={openId === cat.id}
                >
                  <span className="text-left">
                    <div className="text-sm font-medium text-gray-900">{cat.title}</div>
                    <div className="text-xs text-gray-500">{cat.desc}</div>
                  </span>
                  <svg
                    className={`h-5 w-5 text-gray-500 transition-transform ${openId === cat.id ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {openId === cat.id && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => selectCategory(cat.id)}
                      className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-950 px-3 py-1.5 text-white text-sm hover:bg-blue-900"
                    >
                      Start {cat.title} Form
                    </button>
                    {/* quick doc hints */}
                    <ul className="mt-3 ml-5 list-disc text-xs text-gray-500">
                      {cat.requiredDocs.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic form */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="h-full min-h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-xl bg-white">
              <p className="text-sm text-gray-500 px-6 text-center">
                Select a category on the left to begin filling the form.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <FormRenderer categories={CATEGORIES} selectedId={selected} />
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function FormRenderer({ categories, selectedId }) {
  const cat = categories.find((c) => c.id === selectedId);
  if (!cat) return null;
  return <GenericForm category={cat} />;
}

function GenericForm({ category }) {
  const [values, setValues] = React.useState({ amount: "", notes: "", attachment: null });
  const { user, users } = useAuth();
  const { createClaim } = useClaims();
  const navigate = useNavigate();

  const onChange = (e) => {
    const { name, value, files } = e.target;
    setValues((v) => ({ ...v, [name]: files ? files[0] : value }));
  };

  // Resolve managerId (prefer manager email from signup)
  const resolveManagerId = () => {
    if (user.managerId) return user.managerId;
    if (user.manager) {
      const email = String(user.manager).toLowerCase();
      const mm = users.find((u) => (u.email || "").toLowerCase() === email);
      if (mm) return mm.id;
    }
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const s3Key = await uploadToS3(values.attachment);
    const payload = { ...values, attachment: s3Key, category: category.id };
    createClaim({
      userId: user.id,
      managerId: resolveManagerId(),
      category: category.id,
      amount: Number(values.amount || 0),
      payload,
    });
    navigate("/pending-claims");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Details */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-semibold text-gray-700">{category.title} Details</legend>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {category.fields.map((f) =>
            f.type === "select" ? (
              <label key={f.name} className="block text-sm">
                <span className="text-gray-700">{f.label}</span>
                <select
                  name={f.name}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label key={f.name} className="block text-sm">
                <span className="text-gray-700">{f.label}</span>
                <input
                  name={f.name}
                  type={f.type || "text"}
                  onChange={onChange}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </label>
            )
          )}

          <label className="block text-sm">
            <span className="text-gray-700">Amount (₹)</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              value={values.amount}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>
        </div>
      </fieldset>

      {/* Attachments */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-semibold text-gray-700">Attachments (S3)</legend>
        <label className="block text-sm">
          <span className="text-gray-700">Upload Document</span>
          <input
            type="file"
            name="attachment"
            onChange={onChange}
            className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-900 hover:file:bg-blue-100"
          />
        </label>
        <label className="block text-sm mt-2">
          <span className="text-gray-700">Notes (optional)</span>
          <textarea
            name="notes"
            rows={3}
            onChange={onChange}
            className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </label>
        <div className="mt-3">
          <div className="text-xs text-gray-500">Required documents:</div>
          <ul className="ml-5 list-disc text-xs text-gray-500">
            {category.requiredDocs.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </fieldset>

      <div className="pt-2 flex items-center gap-3">
        <button type="submit" className="rounded-md bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">
          Submit
        </button>
        <button type="reset" className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50">
          Reset
        </button>
      </div>
    </form>
  );
}
