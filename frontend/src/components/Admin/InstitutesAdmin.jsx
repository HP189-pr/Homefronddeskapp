// src/components/Admin/InstitutesAdmin.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const emptyForm = {
  institute_id: '',
  institute_code: '',
  institute_name: '',
  institute_campus: '',
  institute_city: '',
  institute_address: '',
};

const InstitutesAdmin = () => {
  const { authFetch } = useAuth();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null); // primary key id for editing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => (a.institute_id ?? 0) - (b.institute_id ?? 0));
  }, [list]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/institutes', { method: 'GET' });
      const data = await res.json();
      setList(data.institutes || []);
    } catch (e) {
      setError('Failed to load institutes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    const payload = {
      institute_id: form.institute_id ? Number(form.institute_id) : undefined,
      institute_code: form.institute_code?.trim() || undefined,
      institute_name: form.institute_name?.trim() || undefined,
      institute_campus: form.institute_campus?.trim() || undefined,
      institute_city: form.institute_city?.trim() || undefined,
      institute_address: form.institute_address?.trim() || undefined,
    };
    try {
      let res;
      if (editingId) {
        res = await authFetch(`/api/admin/institutes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/api/admin/institutes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Request failed');
      }
      await load();
      reset();
    } catch (e) {
      setError(e.message || 'Failed to save');
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      institute_id: row.institute_id ?? '',
      institute_code: row.institute_code ?? '',
      institute_name: row.institute_name ?? '',
      institute_campus: row.institute_campus ?? '',
      institute_city: row.institute_city ?? '',
      institute_address: row.institute_address ?? '',
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Institutes</h2>

      <form onSubmit={handleSubmit} className="bg-gray-50 border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Institute ID (optional)</label>
            <input
              type="number"
              name="institute_id"
              value={form.institute_id}
              onChange={onChange}
              className="w-full p-2 border rounded"
              placeholder="Auto if blank"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Institute Code</label>
            <input
              name="institute_code"
              value={form.institute_code}
              onChange={onChange}
              className="w-full p-2 border rounded"
              placeholder="e.g. ABC001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Institute Name</label>
            <input
              required
              name="institute_name"
              value={form.institute_name}
              onChange={onChange}
              className="w-full p-2 border rounded"
              placeholder="College/Institute Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Campus</label>
            <input
              name="institute_campus"
              value={form.institute_campus}
              onChange={onChange}
              className="w-full p-2 border rounded"
              placeholder="Main/City/—"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              name="institute_city"
              value={form.institute_city}
              onChange={onChange}
              className="w-full p-2 border rounded"
              placeholder="City"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              name="institute_address"
              value={form.institute_address}
              onChange={onChange}
              className="w-full p-2 border rounded"
              rows={2}
              placeholder="Address"
            />
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">
            {editingId ? 'Update Institute' : 'Add Institute'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          )}
        </div>
      </form>

      <div className="border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Institute ID</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Campus</th>
              <th className="px-3 py-2 text-left">City</th>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-2" colSpan={8}>Loading…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={8}>No institutes found.</td></tr>
            ) : (
              sorted.map((row, idx) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{idx + 1}</td>
                  <td className="px-3 py-2">{row.institute_id}</td>
                  <td className="px-3 py-2">{row.institute_code || '—'}</td>
                  <td className="px-3 py-2">{row.institute_name}</td>
                  <td className="px-3 py-2">{row.institute_campus || '—'}</td>
                  <td className="px-3 py-2">{row.institute_city || '—'}</td>
                  <td className="px-3 py-2 max-w-[360px] truncate" title={row.institute_address || ''}>{row.institute_address || '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
                      onClick={() => startEdit(row)}
                    >Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstitutesAdmin;
