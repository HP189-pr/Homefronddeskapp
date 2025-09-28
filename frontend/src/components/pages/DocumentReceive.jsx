import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaPlus, FaSearch, FaSave } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDMY } from '../../utils/date';
import DateInputDMY from '../common/DateInputDMY';
import TopBar from '../common/TopBar';

const initialForm = {
  doc_rec_date: '',
  enrollment_no: '',
  studentname: '',
  doc_type: 'verification',
  // temp numbers
  vryearautonumber: '',
  mgyearautonumber: '',
  pryearautonumber: '',
  ivyearautonumber: '',
  gtmyearautonumber: '',
  // verification counts
  no_of_transcript: 0,
  no_of_marksheet_set: 0,
  no_of_degree: 0,
  no_of_moi: 0,
  no_of_backlog: 0,
  // ECA fields (for verification)
  is_eca: false,
  eca_agency: '',
  eca_agency_other: '',
  eca_remark: '',
  // receipts
  mgrec_no: '',
  prrec_no: '',
  ivrec_no: '',
  // institutional fields
  institution_name: '',
  address1: '',
  address2: '',
  address3: '',
  city: '',
  pincode: '',
  mobile: '',
  email: '',
  // status at receipt stage
  status: 'received',
};

const docTypeOptions = [
  { label: 'Verification', value: 'verification' },
  { label: 'Migration', value: 'migration' },
  { label: 'Provisional', value: 'provisional' },
  { label: 'Institutional Verification', value: 'institutional' },
  { label: 'Grade to Marks', value: 'gtm' },
];

export default function DocumentReceive() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const enrollDebounceRef = useRef();

  const canSave = useMemo(() => !!form.doc_rec_date && !!form.doc_type, [form]);

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (filterType) params.set('doc_type', filterType);
    if (filterStatus) params.set('status', filterStatus);
    // try to fetch many rows; backend supports limit param
    params.set('limit', '1000');
    const res = await authFetch(`/api/admin/doc-receipts?${params.toString()}`);
    if (res.ok) { const data = await res.json(); setItems(data.items || []); }
  };

  useEffect(() => { load(); }, []);

  const onHome = () => window.dispatchEvent(new CustomEvent('app:home'));
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const onChangeNum = (e) => {
    const { name, value } = e.target;
    const n = Number(value || 0);
    setForm((p) => ({ ...p, [name]: Number.isNaN(n) ? 0 : n }));
  };
  const onTypeChange = (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, doc_type: value }));
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onReset = () => { setForm(initialForm); setEditingId(null); };

  const onSave = async () => {
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/doc-receipts/${editingId}` : '/api/admin/doc-receipts';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { await load(); onReset(); } else { const err = await res.json().catch(()=>({})); alert(err.error || 'Save failed'); }
  };

  // Auto-fill student name when enrollment_no changes (debounced)
  useEffect(() => {
    if (!form.enrollment_no) return;
    if (enrollDebounceRef.current) clearTimeout(enrollDebounceRef.current);
    enrollDebounceRef.current = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/enrollments?q=${encodeURIComponent(form.enrollment_no)}`);
        if (res.ok) {
          const data = await res.json();
          const list = data.items || data.rows || data || [];
          if (Array.isArray(list) && list.length) {
            const s = list[0];
            setForm((p) => ({ ...p, studentname: s.studentname || s.student_name || p.studentname }));
          }
        }
      } catch (_) { /* ignore */ }
    }, 400);
    return () => { if (enrollDebounceRef.current) clearTimeout(enrollDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.enrollment_no]);

  const showVerification = form.doc_type === 'verification';
  const showMigration = form.doc_type === 'migration';
  const showProvisional = form.doc_type === 'provisional';
  const showInstitutional = form.doc_type === 'institutional';
  const showGtm = form.doc_type === 'gtm';

  return (
    <div style={{ padding: '8px 16px 16px 6px' }}>
      <TopBar
        logo="📥"
        title="Document Receive"
        onHome={onHome}
        actions={[
          { key: 'add', label: 'Add New', onClick: onReset, icon: <FaPlus />, variant: 'success' },
          { key: 'search', label: 'Search', onClick: load, icon: <FaSearch />, variant: 'primary' },
        ]}
      />

      <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
          <div>
            <label>Date</label>
            <DateInputDMY name="doc_rec_date" value={form.doc_rec_date} onChange={onChange} className="border p-2 w-full" />
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
            <label>Document Type</label>
            <select name="doc_type" value={form.doc_type} onChange={onTypeChange} className="border p-2 w-full">
              {docTypeOptions.map((o)=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select name="status" value={form.status} onChange={onChange} className="border p-2 w-full">
              <option value="received">received</option>
              <option value="in-progress">in-progress</option>
              <option value="done">done</option>
              <option value="cancel">cancel</option>
            </select>
          </div>

          {showVerification && (
            <>
              <div>
                <label>No. of Transcript</label>
                <input type="number" name="no_of_transcript" value={form.no_of_transcript} onChange={onChangeNum} className="border p-2 w-full" />
              </div>
              <div>
                <label>No. of Marksheet Set</label>
                <input type="number" name="no_of_marksheet_set" value={form.no_of_marksheet_set} onChange={onChangeNum} className="border p-2 w-full" />
              </div>
              <div>
                <label>No. of Degree</label>
                <input type="number" name="no_of_degree" value={form.no_of_degree} onChange={onChangeNum} className="border p-2 w-full" />
              </div>
              <div>
                <label>No. of MOI</label>
                <input type="number" name="no_of_moi" value={form.no_of_moi} onChange={onChangeNum} className="border p-2 w-full" />
              </div>
              <div>
                <label>No. of Backlog</label>
                <input type="number" name="no_of_backlog" value={form.no_of_backlog} onChange={onChangeNum} className="border p-2 w-full" />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input id="is_eca" type="checkbox" name="is_eca" checked={!!form.is_eca} onChange={(e)=>setForm(p=>({...p, is_eca: e.target.checked}))} />
                <label htmlFor="is_eca">ECA</label>
              </div>
              {form.is_eca && (
                <>
                  <div>
                    <label>ECA Agency</label>
                    <select name="eca_agency" value={form.eca_agency} onChange={onChange} className="border p-2 w-full">
                      <option value="">Select</option>
                      <option value="WES">WES</option>
                      <option value="IQAS">IQAS</option>
                      <option value="ICES">ICES</option>
                      <option value="ICAS">ICAS</option>
                      <option value="CES">CES</option>
                      <option value="ECE">ECE</option>
                      <option value="PEBC">PEBC</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  {form.eca_agency === 'OTHER' && (
                    <div>
                      <label>Other Agency</label>
                      <input type="text" name="eca_agency_other" value={form.eca_agency_other} onChange={onChange} className="border p-2 w-full" />
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>ECA Remark</label>
                    <input type="text" name="eca_remark" value={form.eca_remark} onChange={onChange} className="border p-2 w-full" />
                  </div>
                </>
              )}
            </>
          )}

          {showMigration && (
            <>
              <div>
                <label>MG Year Auto No</label>
                <input type="text" name="mgyearautonumber" value={form.mgyearautonumber} onChange={onChange} placeholder="auto if blank" className="border p-2 w-full" />
              </div>
              <div>
                <label>Payment Receipt (MG)</label>
                <input type="text" name="mgrec_no" value={form.mgrec_no} onChange={onChange} className="border p-2 w-full" />
              </div>
            </>
          )}

          {showProvisional && (
            <>
              <div>
                <label>PR Year Auto No</label>
                <input type="text" name="pryearautonumber" value={form.pryearautonumber} onChange={onChange} placeholder="auto if blank" className="border p-2 w-full" />
              </div>
              <div>
                <label>Payment Receipt (PR)</label>
                <input type="text" name="prrec_no" value={form.prrec_no} onChange={onChange} className="border p-2 w-full" />
              </div>
            </>
          )}

          {showInstitutional && (
            <>
              <div>
                <label>IV Year Auto No</label>
                <input type="text" name="ivyearautonumber" value={form.ivyearautonumber} onChange={onChange} placeholder="auto if blank" className="border p-2 w-full" />
              </div>
              <div>
                <label>Institution Name</label>
                <input type="text" name="institution_name" value={form.institution_name} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Address 1</label>
                <input type="text" name="address1" value={form.address1} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Address 2</label>
                <input type="text" name="address2" value={form.address2} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Address 3</label>
                <input type="text" name="address3" value={form.address3} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>City</label>
                <input type="text" name="city" value={form.city} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Pincode</label>
                <input type="text" name="pincode" value={form.pincode} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Mobile</label>
                <input type="text" name="mobile" value={form.mobile} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={onChange} className="border p-2 w-full" />
              </div>
              <div>
                <label>Payment Receipt (IV)</label>
                <input type="text" name="ivrec_no" value={form.ivrec_no} onChange={onChange} className="border p-2 w-full" />
              </div>
            </>
          )}

          {showGtm && (
            <div>
              <label>GTM Year Auto No</label>
              <input type="text" name="gtmyearautonumber" value={form.gtmyearautonumber} onChange={onChange} placeholder="auto if blank" className="border p-2 w-full" />
            </div>
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
        <select value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="border p-2">
          <option value="">All Types</option>
          {docTypeOptions.map((o)=> <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="border p-2">
          <option value="">All Status</option>
          <option value="received">received</option>
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
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Enrollment</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Temp #</th>
              <th className="px-3 py-2 text-left">Details</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const temp = row.vryearautonumber || row.mgyearautonumber || row.pryearautonumber || row.ivyearautonumber || row.gtmyearautonumber || '-';
              let details = '';
              if (row.doc_type === 'verification') {
                details = `T:${row.no_of_transcript ?? 0} M:${row.no_of_marksheet_set ?? 0} D:${row.no_of_degree ?? 0} MOI:${row.no_of_moi ?? 0} B:${row.no_of_backlog ?? 0}`;
              } else if (row.doc_type === 'migration') {
                details = row.mgrec_no || '';
              } else if (row.doc_type === 'provisional') {
                details = row.prrec_no || '';
              } else if (row.doc_type === 'institutional') {
                details = row.ivrec_no || '';
              }
              return (
                <tr key={row.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>onEdit(row)}>
                  <td className="px-3 py-2">{row.doc_rec_date ? formatDateDMY(row.doc_rec_date) : '-'}</td>
                  <td className="px-3 py-2 capitalize">{row.doc_type}</td>
                  <td className="px-3 py-2">{row.enrollment_no || '-'}</td>
                  <td className="px-3 py-2">{row.studentname || '-'}</td>
                  <td className="px-3 py-2">{temp}</td>
                  <td className="px-3 py-2">{details || '—'}</td>
                  <td className="px-3 py-2 capitalize">{row.status}</td>
                </tr>
              );
            })}
            {!items.length && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={7}>No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
