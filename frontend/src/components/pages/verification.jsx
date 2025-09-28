import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaSearch, FaSave, FaFileCsv, FaEdit, FaFileUpload, FaEye } from 'react-icons/fa';
import axios from 'axios';
import { saveAs } from 'file-saver';
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
  // new fields
  mail_status: '',
  eca_ref_no: '',
  eca_mail_date: '', // DD-MM-YYYY
  eca_remark: '',
};

export default function Verification() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  // Collapsible top panel state and mode
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('addEdit'); // 'addEdit' | 'search' | 'report'
  // Search/report filters
  const [filterDate, setFilterDate] = useState(''); // DD-MM-YYYY
  const [filterEnrollment, setFilterEnrollment] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // Excel upload preview/import state
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null); // response from preview API
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [excelResult, setExcelResult] = useState(null); // response from confirm API

  const canSave = useMemo(() => !!form.doc_rec_date && !!form.studentname, [form]);

  const load = async (opts = {}) => {
    // Build params based on current filters (or overrides in opts)
    const useDate = opts.filterDate ?? filterDate;
    const useEnroll = (opts.filterEnrollment ?? filterEnrollment).trim();
    const useName = (opts.filterName ?? filterName).trim();
    const useStatus = (opts.filterStatus ?? filterStatus).trim();

    const params = new URLSearchParams();
    // Compose q out of enrollment + name fragments if provided
    const qParts = [];
    if (useEnroll) qParts.push(useEnroll);
    if (useName) qParts.push(useName);
    if (qParts.length) params.set('q', qParts.join(' '));
    if (useStatus) params.set('status', useStatus);
    // Try admin endpoint first (if user has rights), else fallback to public read-only endpoint
    let res = await authFetch(`/api/admin/verifications?${params.toString()}`);
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      res = await authFetch(`/api/verifications?${params.toString()}`);
    }
    if (res.ok) {
      const data = await res.json();
      let arr = data.items || [];
      // If a date filter is set, filter client-side by DMY
      if (useDate) {
        arr = arr.filter((r) => {
          const d = r.doc_rec_date ? formatDateDMY(r.doc_rec_date) : '';
          return d === useDate;
        });
      }
      setItems(arr);
      return arr;
    } else {
      setItems([]);
      return [];
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
  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' });
    setPanelMode('addEdit');
    setPanelOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onReset = () => { setForm(initialForm); setEditingId(null); };
  const onSave = async () => {
    const payload = { ...form, verification_count: Number(form.verification_count || 1) };
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/verifications/${editingId}` : '/api/admin/verifications';
    const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { await load(); onReset(); } else { const err = await res.json().catch(()=>({})); alert(err.error || 'Save failed'); }
  };

  const downloadCsv = (rows) => {
    // Columns reordered to match table and include new fields
    const cols = [
      'doc_rec_date',
      'verification_no',
      'enrollment_no',
      'studentname',
      'no_of_transcript',
      'no_of_marksheet_set',
      'no_of_degree',
      'no_of_moi',
      'no_of_backlog',
      'status',
      'mail_status',
      'remark',
      'eca_agency',
      'eca_ref_no',
      'eca_remark',
      'eca_mail_date',
      'fees_rec_no',
      'doc_scan_copy',
    ];
    const lines = [cols.join(',')].concat(rows.map(r => cols.map(k => {
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

  const onReportDownload = async () => {
    // Fetch filtered rows fresh and download
    const rows = await load();
    downloadCsv(rows);
  };

  // --- Excel upload preview/import logic ---
  const startExcel = () => { setPanelMode('excel'); setPanelOpen(true); };
  const onExcelSelect = (e) => {
    setExcelFile(e.target.files?.[0] || null);
    setExcelPreview(null);
    setExcelResult(null);
    setExcelError('');
  };
  const doExcelPreview = async () => {
    if (!excelFile) return;
    setExcelBusy(true); setExcelError(''); setExcelResult(null);
    try {
      const fd = new FormData();
      fd.append('file', excelFile);
      fd.append('table', 'Verification');
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.post('/api/misc/upload-excel/preview', fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setExcelPreview(res.data);
    } catch (e) {
      setExcelError(e?.response?.data?.error || e.message || 'Preview failed');
    } finally {
      setExcelBusy(false);
    }
  };
  const doExcelConfirm = async () => {
    if (!excelPreview?.tempFileId) return;
    setExcelBusy(true); setExcelError('');
    try {
      const body = { tempFileId: excelPreview.tempFileId, table: 'Verification' };
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.post('/api/misc/upload-excel/confirm', body, { headers });
      setExcelResult(res.data);
      // reload listing after import
      await load();
    } catch (e) {
      setExcelError(e?.response?.data?.error || e.message || 'Import failed');
    } finally {
      setExcelBusy(false);
    }
  };
  const downloadImportLog = async () => {
    if (!excelResult?.logUrl) return;
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.get(excelResult.logUrl, { responseType: 'blob', headers });
      const type = res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), 'verification-import-log.xlsx');
    } catch (e) {
      setExcelError('Failed to download log');
    }
  };

  // --- Report: generate PDF (demo) ---
  const onReportPdf = async () => {
    const rows = await load();
    // Build a simple list with fixed baseline; 12pt ~ 4.23mm line height; use 6mm spacing
    const elements = [];
    const headerY = 20; // mm
    elements.push({ type: 'text', xMm: 10, yMm: headerY, text: 'Verification Report', fontSize: 14 });
    let y = headerY + 10; // start 10mm below header
    const max = Math.min(rows.length, 30);
    for (let i = 0; i < max; i++) {
      const r = rows[i];
      const line = `${(r.doc_rec_date || '').slice(0,10)}  ${r.verification_no || '-'}  ${r.enrollment_no || ''}  ${r.studentname || ''}`;
      elements.push({ type: 'text', xMm: 10, yMm: y, text: line, fontSize: 9 });
      y += 6; // 6mm per line
      if (y > 280) break; // page limit simple guard
    }
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.post('/api/misc/export/pdf', { widthMm: 210, heightMm: 297, inline: true, filename: 'verification-report.pdf', elements }, { responseType: 'blob', headers });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      alert('PDF generation failed');
    }
  };

  // --- View scan copy inline ---
  const onViewScan = async (row) => {
    if (!row?.id) return;
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.get(`/api/files/verification/${row.id}`, { responseType: 'blob', headers });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      alert('Unable to open scan copy');
    }
  };

  // TopBar actions handlers
  const startAdd = () => { onReset(); setPanelMode('addEdit'); setPanelOpen(true); };
  const startSearch = () => { setPanelMode('search'); setPanelOpen(true); };
  const startReport = () => { setPanelMode('report'); setPanelOpen(true); };

  // Project next final number based on current rows (extract trailing digits and ++)
  const projectedNext = useMemo(() => {
    const candidates = (items || []).map((r) => r.verification_no).filter(Boolean);
    if (!candidates.length) return '-';
    const parseSuffix = (s) => {
      const m = String(s).match(/(.*?)(\d+)$/);
      if (!m) return { prefix: s, num: NaN, width: 0 };
      return { prefix: m[1], num: Number(m[2]), width: m[2].length };
    };
    const enriched = candidates.map((s) => ({ s, ...parseSuffix(s) }));
    // pick the one with max numeric suffix; fallback to first
    enriched.sort((a, b) => (isNaN(b.num) ? -1 : b.num) - (isNaN(a.num) ? -1 : a.num));
    const best = enriched[0];
    if (isNaN(best.num)) return best.s;
    const next = String(best.num + 1).padStart(best.width, '0');
    return `${best.prefix}${next}`;
  }, [items]);

  return (
  <div style={{ padding: '8px 16px 16px 6px' }}>
      <TopBar
        logo="📜"
        title="Verification"
        onHome={onHome}
        actions={[
          { key: 'add', label: 'Transcript Add', onClick: startAdd, icon: <FaPlus />, variant: 'success' },
          { key: 'search', label: 'Search', onClick: startSearch, icon: <FaSearch />, variant: 'primary' },
          { key: 'edit', label: 'Edit', onClick: () => { setPanelMode('addEdit'); setPanelOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }, icon: <FaEdit />, variant: 'warning', disabled: !editingId },
          { key: 'excel', label: 'Excel Upload', onClick: startExcel, icon: <FaFileUpload />, variant: 'secondary' },
          { key: 'report', label: 'Report', onClick: startReport, icon: <FaFileCsv />, variant: 'info' },
        ]}
      />
      {/* Collapsible top panel: only visible when panelOpen */}
      {panelOpen && (
        <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-700 font-semibold capitalize">
              {panelMode === 'addEdit' ? 'Add / Edit' : panelMode}
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              aria-label="Collapse"
              title="Collapse"
            >
              ^
            </button>
          </div>

          {panelMode === 'addEdit' && (
            <>
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
                <div>
                  <label>Email (mail_status)</label>
                  <input type="text" name="mail_status" value={form.mail_status} onChange={onChange} className="border p-2 w-full" />
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
                      <label>ECA-Ref.No</label>
                      <input type="text" name="eca_ref_no" value={form.eca_ref_no} onChange={onChange} className="border p-2 w-full" />
                    </div>
                    <div>
                      <label>ECA Remark</label>
                      <input type="text" name="eca_remark" value={form.eca_remark} onChange={onChange} className="border p-2 w-full" />
                    </div>
                    <div>
                      <label>Mail-Date</label>
                      <DateInputDMY name="eca_mail_date" value={form.eca_mail_date} onChange={onChange} className="border p-2 w-full" />
                    </div>
                  </>
                )}
                <div>
                  <label>Fees Rec</label>
                  <input type="text" name="fees_rec_no" value={form.fees_rec_no} onChange={onChange} className="border p-2 w-full" />
                </div>
              </div>
              {form.verification_no && (
                <div className="text-sm text-gray-700 mt-2">Auto file path: <span className="font-mono">{form.doc_scan_copy || `${form.verification_no}.pdf`}</span></div>
              )}
              <div style={{ marginTop: 12 }}>
                <button disabled={!canSave} onClick={onSave} style={{ opacity: canSave ? 1 : 0.6, padding: '8px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4 }}>
                  <FaSave /> Save
                </button>
              </div>
            </>
          )}

          {(panelMode === 'search' || panelMode === 'report' || panelMode === 'excel') && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 6 }}>
                {panelMode !== 'excel' && (
                  <div>
                  <label>Date</label>
                  <DateInputDMY name="filterDate" value={filterDate} onChange={(e)=> setFilterDate(e.target.value)} className="border p-2 w-full" />
                  </div>
                )}
                {panelMode !== 'excel' && (
                  <div>
                  <label>Enrollment</label>
                  <input type="text" value={filterEnrollment} onChange={(e)=> setFilterEnrollment(e.target.value)} className="border p-2 w-full" />
                  </div>
                )}
                {panelMode !== 'excel' && (
                  <div>
                  <label>Student Name</label>
                  <input type="text" value={filterName} onChange={(e)=> setFilterName(e.target.value)} className="border p-2 w-full" />
                  </div>
                )}
                {panelMode !== 'excel' && (
                  <div>
                  <label>Status</label>
                  <select value={filterStatus} onChange={(e)=> setFilterStatus(e.target.value)} className="border p-2 w-full">
                    <option value="">All</option>
                    <option value="pending">pending</option>
                    <option value="in-progress">in-progress</option>
                    <option value="done">done</option>
                    <option value="cancel">cancel</option>
                  </select>
                  </div>
                )}
                {panelMode === 'excel' && (
                  <>
                    <div style={{ gridColumn: 'auto / span 2' }}>
                      <label>Choose Excel (.xlsx)</label>
                      <input type="file" accept=".xlsx" onChange={onExcelSelect} className="border p-2 w-full" />
                    </div>
                    <div style={{ gridColumn: 'auto / span 2' }} className="text-sm text-gray-600">
                      Template expects headers matching Verification columns (case/space-insensitive). Required fields must be present.
                    </div>
                  </>
                )}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {panelMode === 'search' && (
                  <button onClick={()=> load()} style={{ padding: '8px 12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
                    <FaSearch /> Apply
                  </button>
                )}
                {panelMode === 'report' && (
                  <button onClick={onReportDownload} style={{ padding: '8px 12px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 4 }}>
                    <FaFileCsv /> Download CSV
                  </button>
                )}
                {panelMode === 'report' && (
                  <button onClick={onReportPdf} style={{ padding: '8px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4 }}>
                    Open PDF
                  </button>
                )}
                {panelMode === 'excel' && (
                  <>
                    <button disabled={!excelFile || excelBusy} onClick={doExcelPreview} style={{ padding: '8px 12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, opacity: !excelFile || excelBusy ? 0.7 : 1 }}>
                      Preview
                    </button>
                    {excelPreview && (
                      <button disabled={excelBusy} onClick={doExcelConfirm} style={{ padding: '8px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4 }}>
                        Submit Import
                      </button>
                    )}
                    {excelResult?.logUrl && (
                      <button onClick={downloadImportLog} style={{ padding: '8px 12px', background: '#6610f2', color: '#fff', border: 'none', borderRadius: 4 }}>
                        Download Log
                      </button>
                    )}
                  </>
                )}
              </div>

              {panelMode === 'excel' && (
                <div className="mt-3">
                  {excelError && <div className="text-red-600 text-sm mb-2">{excelError}</div>}
                  {excelPreview && (
                    <div className="border rounded p-2">
                      <div className="text-sm">Rows: {excelPreview.totalRows}, Missing: {excelPreview.missingColumns?.join(', ') || 'none'}, Extra: {excelPreview.extraColumns?.join(', ') || 'none'}</div>
                      <div className="overflow-auto mt-2">
                        <table className="min-w-full text-sm border">
                          <thead>
                            <tr>
                              {excelPreview.mappedColumns?.map((h) => (
                                <th key={h} className="border px-2 py-1 text-left bg-gray-50">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreview.previewRows?.map((row, idx) => (
                              <tr key={idx}>
                                {excelPreview.mappedColumns?.map((h) => (
                                  <td key={h} className="border px-2 py-1">{String(row[h] ?? '')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {excelResult && (
                    <div className="border rounded p-2 mt-2 text-sm">
                      <div>Inserted: {excelResult.inserted}, Failed: {excelResult.failed}, Total: {excelResult.total}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-mono" style={{ width: '11ch' }}>Date</th>
              <th className="px-3 py-2 text-left font-mono" style={{ width: '12ch' }}>FileNo</th>
              <th className="px-3 py-2 text-left">Enrollment</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">T</th>
              <th className="px-3 py-2 text-left">MS</th>
              <th className="px-3 py-2 text-left">Deg</th>
              <th className="px-3 py-2 text-left">MOI</th>
              <th className="px-3 py-2 text-left">BL</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Remark</th>
              <th className="px-3 py-2 text-left">ECA Agency</th>
              <th className="px-3 py-2 text-left">ECA-Ref.No</th>
              <th className="px-3 py-2 text-left">ECA Remark</th>
              <th className="px-3 py-2 text-left">Mail-Date</th>
              <th className="px-3 py-2 text-left">Fees Rec</th>
              <th className="px-3 py-2 text-left">Scan</th>
              
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>onEdit(row)}>
                <td className="px-3 py-2 font-mono whitespace-nowrap truncate" style={{ width: '11ch' }}
                    title={row.doc_rec_date ? formatDateDMY(row.doc_rec_date) : '-'}>
                  {row.doc_rec_date ? formatDateDMY(row.doc_rec_date) : '-'}
                </td>
                <td className="px-3 py-2 font-mono whitespace-nowrap truncate" style={{ width: '12ch' }}
                    title={row.verification_no || '-'}>
                  {row.verification_no || '-'}
                </td>
                <td className="px-3 py-2">{row.enrollment_no || '-'}</td>
                <td className="px-3 py-2">{row.studentname || '-'}</td>
                <td className="px-3 py-2">{row.no_of_transcript ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_marksheet_set ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_degree ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_moi ?? 0}</td>
                <td className="px-3 py-2">{row.no_of_backlog ?? 0}</td>
                <td className="px-3 py-2 capitalize">{row.status}</td>
                <td className="px-3 py-2">{row.mail_status || '-'}</td>
                <td className="px-3 py-2">{row.remark || '-'}</td>
                <td className="px-3 py-2">{row.is_eca ? (row.eca_agency || row.eca_agency_other || 'Yes') : '-'}</td>
                <td className="px-3 py-2">{row.eca_ref_no || '-'}</td>
                <td className="px-3 py-2">{row.eca_remark || '-'}</td>
                <td className="px-3 py-2">{row.eca_mail_date ? formatDateDMY(row.eca_mail_date) : '-'}</td>
                <td className="px-3 py-2">{row.fees_rec_no || '-'}</td>
                <td className="px-3 py-2">
                  {row.doc_scan_copy ? (
                    <button onClick={(e) => { e.stopPropagation(); onViewScan(row); }} className="text-blue-600 hover:underline flex items-center gap-1">
                      <FaEye /> View
                    </button>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={18}>No results</td></tr>
            )}
            <tr className="border-t bg-gray-50">
              <td className="px-3 py-2 text-right font-semibold">Next Final #</td>
              <td className="px-3 py-2 font-mono" title={projectedNext}>{projectedNext}</td>
              <td className="px-3 py-2" colSpan={16}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
