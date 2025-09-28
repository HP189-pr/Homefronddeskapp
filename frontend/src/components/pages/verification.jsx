import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaSearch, FaSave, FaFileCsv, FaEdit } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDMY } from '../../utils/date';
import DateInputDMY from '../common/DateInputDMY';
import TopBar from '../common/TopBar';

const initialForm = {
  doc_rec_date: '',
  verification_no: '', // final 01-YY####
  vryearautonumber: '', // temp vrYYYY#### (nullable)
  enrollment_no: '',
  studentname: '',
  // counts
  no_of_transcript: 0,
  no_of_marksheet_set: 0,
  no_of_degree: 0,
  no_of_moi: 0,
  no_of_backlog: 0,
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
  const onChangeNum = (e) => {
    const { name, value } = e.target;
    const digits = String(value || '').replace(/[^0-9]/g, '').slice(0, 4);
    const num = digits === '' ? '' : Number(digits);
    setForm((p) => ({ ...p, [name]: num }));
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

  const onReport = () => {
    // simple CSV export of current items
    const cols = ['doc_rec_date','verification_no','enrollment_no','studentname','no_of_transcript','no_of_marksheet_set','no_of_degree','no_of_moi','no_of_backlog','fees_rec_no','status','is_eca','eca_agency','eca_agency_other','eca_remark','remark'];
    const lines = [cols.join(',')].concat(items.map(r => cols.map(k => {
      const v = r[k];
      const s = v == null ? '' : String(v).replace(/"/g,'""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')));
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'verifications.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };

  return (
  <div style={{ padding: '8px 16px 16px 6px' }}>
      <TopBar
        logo="📜"
        title="Verification"
        onHome={onHome}
        actions={[
          { key: 'add', label: 'Transcript Add', onClick: onReset, icon: <FaPlus />, variant: 'success' },
          { key: 'search', label: 'Search', onClick: load, icon: <FaSearch />, variant: 'primary' },
          { key: 'edit', label: 'Edit', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), icon: <FaEdit />, variant: 'warning', disabled: !editingId },
          { key: 'report', label: 'Report', onClick: onReport, icon: <FaFileCsv />, variant: 'info' },
        ]}
      />

      <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 6 }}>
          <div>
            <label>Date</label>
            <DateInputDMY name="doc_rec_date" value={form.doc_rec_date} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Enrollment</label>
            <input
              type="text"
              name="enrollment_no"
              value={form.enrollment_no}
              onChange={(e) => {
                const v = (e.target.value || '').slice(0, 16);
                setForm((p) => ({ ...p, enrollment_no: v }));
              }}
              maxLength={16}
              className="border p-2 w-full"
            />
          </div>
          <div style={{ gridColumn: 'auto / span 2' }}>
            <label>Student Name</label>
            <input type="text" name="studentname" value={form.studentname} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Transcript</label>
              <input type="number" min={0} max={9999} step={1} inputMode="numeric" pattern="\\d*" name="no_of_transcript" value={form.no_of_transcript} onChange={onChangeNum} className="border p-2" style={{ width: 64 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Marksheet</label>
              <input type="number" min={0} max={9999} step={1} inputMode="numeric" pattern="\\d*" name="no_of_marksheet_set" value={form.no_of_marksheet_set} onChange={onChangeNum} className="border p-2" style={{ width: 64 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Degree</label>
              <input type="number" min={0} max={9999} step={1} inputMode="numeric" pattern="\\d*" name="no_of_degree" value={form.no_of_degree} onChange={onChangeNum} className="border p-2" style={{ width: 64 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>MOI</label>
              <input type="number" min={0} max={9999} step={1} inputMode="numeric" pattern="\\d*" name="no_of_moi" value={form.no_of_moi} onChange={onChangeNum} className="border p-2" style={{ width: 64 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Back-log</label>
              <input type="number" min={0} max={9999} step={1} inputMode="numeric" pattern="\\d*" name="no_of_backlog" value={form.no_of_backlog} onChange={onChangeNum} className="border p-2" style={{ width: 64 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Status</label>
              <select name="status" value={form.status} onChange={onChange} className="border p-2" style={{ width: 110 }}>
                <option value="pending">pending</option>
                <option value="in-progress">in-progress</option>
                <option value="done">done</option>
                <option value="cancel">cancel</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Fees</label>
              <input type="text" name="fees_rec_no" value={form.fees_rec_no} onChange={onChange} className="border p-2" style={{ width: 120 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Final #</label>
              <input type="text" name="verification_no" value={form.verification_no} onChange={onChange} placeholder="auto on done" className="border p-2" style={{ width: 120 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={{ margin: 0 }}>Remark</label>
              <input type="text" name="remark" value={form.remark} onChange={onChange} className="border p-2" style={{ width: 160 }} />
            </div>
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
        {form.verification_no && (
          <div className="text-sm text-gray-700 mt-2">Auto file path: <span className="font-mono">{form.doc_scan_copy || `${form.verification_no}.pdf`}</span></div>
        )}
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

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Final #</th>
              <th className="px-3 py-2 text-left">Enrollment</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">T</th>
              <th className="px-3 py-2 text-left">MS</th>
              <th className="px-3 py-2 text-left">Deg</th>
              <th className="px-3 py-2 text-left">MOI</th>
              <th className="px-3 py-2 text-left">BL</th>
              <th className="px-3 py-2 text-left">Fees Rec</th>
              <th className="px-3 py-2 text-left">ECA Agency</th>
              <th className="px-3 py-2 text-left">ECA Remark</th>
              <th className="px-3 py-2 text-left">Remark</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>onEdit(row)}>
                <td className="px-3 py-2">{row.doc_rec_date ? formatDateDMY(row.doc_rec_date) : '-'}</td>
                <td className="px-3 py-2">{row.verification_no || '-'}</td>
                <td className="px-3 py-2">{row.enrollment_no || '-'}</td>
                <td className="px-3 py-2">{row.studentname || '-'}</td>
                <td className="px-3 py-2">{row.no_of_transcript ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_marksheet_set ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_degree ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_moi ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_backlog ?? 0}</td>
                <td className="px-3 py-2">{row.fees_rec_no || '-'}</td>
                <td className="px-3 py-2">{row.is_eca ? (row.eca_agency || row.eca_agency_other || 'Yes') : '-'}</td>
                <td className="px-3 py-2">{row.eca_remark || '-'}</td>
                <td className="px-3 py-2">{row.remark || '-'}</td>
                <td className="px-3 py-2 capitalize">{row.status}</td>
              </tr>
            ))}
            {!items.length && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={14}>No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
