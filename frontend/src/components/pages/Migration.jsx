import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaSearch, FaSave } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import TopBar from '../common/TopBar';
import DateInputDMY from '../common/DateInputDMY';
import PageScaffold from '../common/PageScaffold';

const initialForm = {
  doc_rec_date: '',
  pryearautonumber: '',
  enrollment_no: '',
  studentname: '',
  migration_number: '',
  status: 'pending',
  migration_scan_copy: '',
};

export default function Migration() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const canSave = useMemo(() => !!form.doc_rec_date, [form]);

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    const res = await authFetch(`/api/admin/migrations?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  };

  useEffect(() => { load(); }, []);
  const onHome = () => window.dispatchEvent(new CustomEvent('app:home'));
  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onEdit = (row) => { setEditingId(row.id); setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const onReset = () => { setForm(initialForm); setEditingId(null); };
  const onSave = async () => {
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/migrations/${editingId}` : '/api/admin/migrations';
    const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { await load(); onReset(); } else { const err = await res.json().catch(()=>({})); alert(err.error || 'Save failed'); }
  };

  const header = (
    <TopBar
      logo="🚀"
      title="Migration"
      onHome={onHome}
      actions={[
        { key: 'add', label: 'Add New', onClick: onReset, icon: <FaPlus />, variant: 'success' },
        { key: 'search', label: 'Search', onClick: load, icon: <FaSearch />, variant: 'primary' },
      ]}
    />
  );

  const formBox = (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
        <div>
          <label>Date</label>
          <DateInputDMY name="doc_rec_date" value={form.doc_rec_date} onChange={onChange} className="border p-2 w-full" />
        </div>
        <div>
          <label>PR Year Auto No</label>
          <input type="text" name="pryearautonumber" value={form.pryearautonumber} onChange={onChange} placeholder="auto" className="border p-2 w-full" />
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
            <option value="done">done</option>
            <option value="cancel">cancel</option>
            <option value="correction">correction</option>
          </select>
        </div>
        <div>
          <label>Final Number</label>
          <input type="text" name="migration_number" value={form.migration_number} onChange={onChange} placeholder="auto on done" className="border p-2 w-full" />
        </div>
        <div>
          <label>Scan Copy (path)</label>
          <input type="text" name="migration_scan_copy" value={form.migration_scan_copy} onChange={onChange} className="border p-2 w-full" />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button disabled={!canSave} onClick={onSave} style={{ opacity: canSave ? 1 : 0.6, padding: '8px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaSave /> Save
        </button>
      </div>
    </div>
  );

  const records = (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search..." value={q} onChange={(e)=>setQ(e.target.value)} className="border p-2" />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border p-2">
          <option value="">All Status</option>
          <option value="pending">pending</option>
          <option value="done">done</option>
          <option value="cancel">cancel</option>
          <option value="correction">correction</option>
        </select>
        <button onClick={load} style={{ padding: '8px 12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaSearch /> Apply
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, paddingBottom: 8 }}>
        {items.map((row) => (
          <div key={row.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{row.studentname || '(no name)'}</strong>
              <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: '#f1f3f5' }}>{row.status}</span>
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>
              <div>PR Year#: {row.pryearautonumber || '-'}</div>
              <div>Final#: {row.migration_number || '-'}</div>
              <div>Enroll: {row.enrollment_no || '-'}</div>
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

  return (
    <PageScaffold header={header} form={formBox} records={records} />
  );
}
