"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api, Asset } from "@/lib/api";

type FormState = {
  tag: string;
  name: string;
  category: string;
  status: string;
  location: string;
  assigned_to: string;
  purchase_date: string;
  purchase_price: string;
  notes: string;
};

const emptyForm: FormState = {
  tag: "",
  name: "",
  category: "General",
  status: "available",
  location: "",
  assigned_to: "",
  purchase_date: "",
  purchase_price: "",
  notes: ""
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

function toPayload(form: FormState) {
  return {
    tag: form.tag.trim(),
    name: form.name.trim(),
    category: form.category.trim() || "General",
    status: form.status.trim() || "available",
    location: form.location.trim(),
    assigned_to: form.assigned_to.trim() || null,
    purchase_date: form.purchase_date || null,
    purchase_price: form.purchase_price === "" ? null : Number(form.purchase_price),
    notes: form.notes.trim() || null
  };
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAssets() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.listAssets();
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = toPayload(form);

      if (editingId === null) {
        await api.createAsset(payload);
      } else {
        await api.updateAsset(editingId, payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(asset: Asset) {
    setEditingId(asset.id);
    setForm({
      tag: asset.tag,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      location: asset.location,
      assigned_to: asset.assigned_to ?? "",
      purchase_date: asset.purchase_date ?? "",
      purchase_price: asset.purchase_price?.toString() ?? "",
      notes: asset.notes ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(assetId: number) {
    const confirmed = window.confirm("Should this asset be deleted?");
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);

    try {
      await api.deleteAsset(assetId);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while deleting.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            TraceMyAssets
          </p>
          <h1 className="text-3xl font-bold">Asset Management Panel</h1>
          <p className="text-slate-400">Create, edit, and track inventory records.</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <InputField label="Tag" name="tag" value={form.tag} onChange={handleChange} required />
          <InputField label="Name" name="name" value={form.name} onChange={handleChange} required />
          <InputField label="Category" name="category" value={form.category} onChange={handleChange} />
          <SelectField
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={["available", "in_use", "maintenance", "retired"]}
          />
          <InputField label="Location" name="location" value={form.location} onChange={handleChange} />
          <InputField
            label="Assigned To"
            name="assigned_to"
            value={form.assigned_to}
            onChange={handleChange}
          />
          <InputField
            label="Purchase Date"
            name="purchase_date"
            type="date"
            value={form.purchase_date}
            onChange={handleChange}
          />
          <InputField
            label="Purchase Price"
            name="purchase_price"
            type="number"
            step="0.01"
            value={form.purchase_price}
            onChange={handleChange}
          />
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="Optional notes..."
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : editingId === null ? "Add Asset" : "Update"}
            </button>

            {editingId !== null ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Asset List</h2>
            <p className="text-sm text-slate-400">Total {assets.length} records</p>
          </div>

          <button
            type="button"
            onClick={() => void loadAssets()}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-slate-400">Loading...</div>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
            No records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="px-4 py-3 font-medium">Tag</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Purchase</th>
                  <th className="px-4 py-3 font-medium">Creation</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-slate-800/80 align-top">
                    <td className="px-4 py-4 font-medium text-cyan-300">{asset.tag}</td>
                    <td className="px-4 py-4">{asset.name}</td>
                    <td className="px-4 py-4">{asset.status}</td>
                    <td className="px-4 py-4">{asset.location || "-"}</td>
                    <td className="px-4 py-4">{asset.assigned_to || "-"}</td>
                    <td className="px-4 py-4">
                      <div>
                        {asset.purchase_price !== null
                          ? `${asset.purchase_price.toFixed(2)} ₺`
                          : "-"}
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(asset.purchase_date)}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-400">{formatDateTime(asset.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(asset)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium transition hover:border-slate-500 hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(asset.id)}
                          disabled={isSaving}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  required
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}