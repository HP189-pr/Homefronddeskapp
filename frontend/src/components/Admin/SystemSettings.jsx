import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const KNOWN_KEYS = [
  { key: 'verification.doc_base', label: 'Verification Docs Base Path' },
  { key: 'docs.base', label: 'Default Docs Base Path (fallback)' },
];

export default function SystemSettings() {
  const { authFetch } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    const res = await authFetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      const kv = {};
      (data.settings || []).forEach((row) => { kv[row.key] = row.value ?? ''; });
      setSettings((prev) => ({ ...prev, ...kv }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onChange = (k, v) => setSettings((p) => ({ ...p, [k]: v }));
  const onSave = async (k) => {
    const res = await authFetch(`/api/admin/settings/${encodeURIComponent(k)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: settings[k] ?? '' }),
    });
    if (res.ok) setMessage('Saved'); else setMessage('Save failed');
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">System Settings</h3>
      <p className="text-sm text-gray-600 mb-4">Configure base paths used to auto-generate scan copy paths when final number is assigned.</p>
      <div className="space-y-3">
        {KNOWN_KEYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <label className="w-72 text-sm text-gray-700">{label}</label>
            <input
              className="border p-2 flex-1"
              value={settings[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="e.g., /files/verifications or https://cdn.example.com/vr"
            />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" disabled={loading} onClick={() => onSave(key)}>Save</button>
          </div>
        ))}
      </div>
      {message && <div className="mt-3 text-sm text-green-600">{message}</div>}
    </div>
  );
}
