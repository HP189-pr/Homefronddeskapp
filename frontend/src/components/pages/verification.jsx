import React, { useEffect, useMemo, useState } from 'react';
import { FaHome, FaPlus, FaSearch, FaSave } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

const initialForm = {
  doc_rec_date: '',
  verification_no: '', // final 01-YY####
  vryearautonumber: '', // temp vrYYYY#### (nullable)
  enrollment_no: '',
  studentname: '',
  verification_count: 1,
  status: 'pending',
  fees_rec_no: '',
  remark: '',
  doc_scan_copy: '',
  is_eca: false,
  eca_agency: '',
  eca_remark: '',
};

export default function Verification() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const canSave = useMemo(() => !!form.doc_rec_date && !!form.studentname, [form]);

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    // Try admin endpoint first (if user has rights), else fallback to public read-only endpoint
    let res = await authFetch(`/api/admin/verifications?${params.toString()}`);
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      res = await authFetch(`/api/verifications?${params.toString()}`);
    }
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    } else {
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const onHome = () => window.dispatchEvent(new CustomEvent('app:home'));
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };
  const onEdit = (row) => { setEditingId(row.id); setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const onReset = () => { setForm(initialForm); setEditingId(null); };
  const onSave = async () => {
    const payload = { ...form, verification_count: Number(form.verification_count || 1) };
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/verifications/${editingId}` : '/api/admin/verifications';
    const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { await load(); onReset(); } else { const err = await res.json().catch(()=>({})); alert(err.error || 'Save failed'); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button title="Home" onClick={onHome} style={{ padding: '8px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaHome /> Home
        </button>
  <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>📜 Verification</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onReset} style={{ padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaPlus /> Add New
        </button>
        <button onClick={load} style={{ padding: '8px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaSearch /> Search
        </button>
      </div>

      <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
          <div>
            <label>Date</label>
            <input type="date" name="doc_rec_date" value={form.doc_rec_date} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Enrollment No</label>
            <input type="text" name="enrollment_no" value={form.enrollment_no} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Student Name</label>
            <input type="text" name="studentname" value={form.studentname} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Status</label>
            <select name="status" value={form.status} onChange={onChange} className="border p-2 w-full">
              <option value="pending">pending</option>
              <option value="in-progress">in-progress</option>
              <option value="done">done</option>
              <option value="cancel">cancel</option>
            </select>
          </div>
          <div>
            <label>Verification Count</label>
            <input type="number" min={1} name="verification_count" value={form.verification_count} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Fees Receipt No</label>
            <input type="text" name="fees_rec_no" value={form.fees_rec_no} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Final Number</label>
            <input type="text" name="verification_no" value={form.verification_no} onChange={onChange} placeholder="auto on done" className="border p-2 w-full" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Remark</label>
            <input type="text" name="remark" value={form.remark} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Scan Copy (path)</label>
            <input type="text" name="doc_scan_copy" value={form.doc_scan_copy} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="is_eca" type="checkbox" name="is_eca" checked={!!form.is_eca} onChange={onChange} />
            <label htmlFor="is_eca">ECA</label>
          </div>
          {form.is_eca && (
            <>
              <div>
                <label>ECA Agency</label>
                <input type="text" name="eca_agency" value={form.eca_agency} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>ECA Remark</label>
                <input type="text" name="eca_remark" value={form.eca_remark} onChange={onChange} className="border p-2 w-full" />
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={!canSave} onClick={onSave} style={{ opacity: canSave ? 1 : 0.6, padding: '8px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4 }}>
            <FaSave /> Save
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search..." value={q} onChange={(e)=>setQ(e.target.value)} className="border p-2" />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border p-2">
          <option value="">All Status</option>
          <option value="pending">pending</option>
          <option value="in-progress">in-progress</option>
          <option value="done">done</option>
          <option value="cancel">cancel</option>
        </select>
        <button onClick={load} style={{ padding: '8px 12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaSearch /> Apply
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {items.map((row) => (
          <div key={row.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{row.studentname || '(no name)'}</strong>
              <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: '#f1f3f5' }}>{row.status}</span>
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>
              <div>Final#: {row.verification_no || '-'}</div>
              <div>Temp#: {row.vryearautonumber || '-'}</div>
              <div>Enroll: {row.enrollment_no || '-'}</div>
              <div>Count: {row.verification_count || 1}</div>
              <div>ECA: {row.is_eca ? 'Yes' : 'No'}</div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={()=>onEdit(row)} style={{ padding: '6px 10px', background: '#ffc107', border: 'none', borderRadius: 4 }}>Edit</button>
            </div>
          </div>
        ))}
        {!items.length && <div style={{ opacity: 0.7 }}>No results</div>}
      </div>
    </div>
  );
}
