import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaPlus,
  FaSearch,
  FaSave,
  FaFileCsv,
  FaFilePdf,
  FaChevronUp,
  FaChevronDown,
} from 'react-icons/fa';
import axios from 'axios';
import { saveAs } from 'file-saver';
import PageLayout from './PageLayout';

const initialForm = {
  dg_sr_no: '',
  enrollment_no: '',
  student_name_dg: '',
  dg_address: '',
  institute_name_dg: '',
  degree_name: '',
  specialisation: '',
  seat_last_exam: '',
  last_exam_month: '',
  last_exam_year: '',
  class_obtain: '',
  course_language: '',
  dg_rec_no: '',
  dg_gender: '',
  convocation_no: '',
};

export default function Degree() {
  const [items, setItems] = useState([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelMode, setPanelMode] = useState('addEdit'); // 'addEdit' | 'search' | 'report'
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({
    degree_name: '',
    year: '',
    convocation_no: '',
  });

  const canSave = useMemo(() => !!form.student_name_dg, [form]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (filters.degree_name) params.set('degree_name', filters.degree_name);
      if (filters.year) params.set('year', filters.year);
      if (filters.convocation_no)
        params.set('convocation_no', filters.convocation_no);
      const res = await axios.get(`/api/degrees?${params.toString()}`, {
        headers: authHeaders(),
      });
      setItems(res.data?.rows || []);
    } catch (err) {
      setItems([]);
      alert(
        err?.response?.data?.error || err.message || 'Failed to fetch degrees',
      );
    }
  }, [q, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({ ...initialForm, ...row });
    setPanelMode('addEdit');
    setPanelOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onReset = () => {
    setForm(initialForm);
    setEditingId(null);
  };
  const onSave = async () => {
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/degrees/${editingId}` : '/api/degrees';
    try {
      await axios({ method, url, data: form, headers: authHeaders() });
      await load();
      onReset();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Save failed');
    }
  };

  const downloadCsv = (rows) => {
    const cols = [
      'dg_sr_no',
      'enrollment_no',
      'student_name_dg',
      'dg_address',
      'institute_name_dg',
      'degree_name',
      'specialisation',
      'seat_last_exam',
      'last_exam_month',
      'last_exam_year',
      'class_obtain',
      'course_language',
      'dg_rec_no',
      'dg_gender',
      'convocation_no',
    ];
    const lines = [cols.join(',')].concat(
      rows.map((r) =>
        cols
          .map((k) => {
            const v = r[k];
            const s = v == null ? '' : String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(','),
      ),
    );
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    saveAs(blob, 'degrees.csv');
  };

  const onReportPdf = async () => {
    const rows = items;
    const elements = [
      { type: 'text', xMm: 10, yMm: 15, text: 'Degree Report', fontSize: 14 },
    ];
    let y = 25;
    const max = Math.min(rows.length, 40);
    for (let i = 0; i < max; i++) {
      const r = rows[i];
      const line = `${r.enrollment_no || ''}  ${r.student_name_dg || ''}  ${
        r.degree_name || ''
      } (${r.last_exam_year || ''})`;
      elements.push({ type: 'text', xMm: 10, yMm: y, text: line, fontSize: 9 });
      y += 6;
      if (y > 280) break;
    }
    try {
      const res = await axios.post(
        '/api/misc/export/pdf',
        {
          widthMm: 210,
          heightMm: 297,
          inline: true,
          filename: 'degree-report.pdf',
          elements,
        },
        { responseType: 'blob', headers: authHeaders() },
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      alert('PDF generation failed');
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          onReset();
          setPanelMode('addEdit');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white shadow-sm hover:bg-emerald-500"
      >
        <FaPlus className="text-sm" /> Add
      </button>
      <button
        type="button"
        onClick={() => {
          setPanelMode('search');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-500"
      >
        <FaSearch className="text-sm" /> Search
      </button>
      <button
        type="button"
        onClick={() => {
          setPanelMode('report');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-cyan-600 text-white shadow-sm hover:bg-cyan-500"
      >
        <FaFileCsv className="text-sm" /> Report
      </button>
    </div>
  );

  const formPanel = (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
        <div className="text-base font-semibold capitalize text-gray-700">
          {panelMode === 'addEdit' ? 'Entry Panel' : panelMode}
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((p) => !p)}
          className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          {panelOpen ? <FaChevronUp /> : <FaChevronDown />}
          {panelOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {panelOpen && (
        <div className="p-4">
          {panelMode === 'addEdit' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
                  gap: 6,
                }}
              >
                <div>
                  <label htmlFor="dg_sr_no">DG Sr No</label>
                  <input
                    id="dg_sr_no"
                    name="dg_sr_no"
                    value={form.dg_sr_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="enrollment_no">Enrollment</label>
                  <input
                    id="enrollment_no"
                    name="enrollment_no"
                    value={form.enrollment_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div style={{ gridColumn: 'auto / span 2' }}>
                  <label htmlFor="student_name_dg">Student Name</label>
                  <input
                    id="student_name_dg"
                    name="student_name_dg"
                    value={form.student_name_dg}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div style={{ gridColumn: 'auto / span 2' }}>
                  <label htmlFor="dg_address">Address</label>
                  <input
                    id="dg_address"
                    name="dg_address"
                    value={form.dg_address}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="institute_name_dg">Institute</label>
                  <input
                    id="institute_name_dg"
                    name="institute_name_dg"
                    value={form.institute_name_dg}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="degree_name">Degree</label>
                  <input
                    id="degree_name"
                    name="degree_name"
                    value={form.degree_name}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="specialisation">Specialisation</label>
                  <input
                    id="specialisation"
                    name="specialisation"
                    value={form.specialisation}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="seat_last_exam">Seat (last exam)</label>
                  <input
                    id="seat_last_exam"
                    name="seat_last_exam"
                    value={form.seat_last_exam}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="last_exam_month">Exam Month</label>
                  <input
                    id="last_exam_month"
                    name="last_exam_month"
                    value={form.last_exam_month}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="last_exam_year">Exam Year</label>
                  <input
                    id="last_exam_year"
                    name="last_exam_year"
                    value={form.last_exam_year}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="class_obtain">Class Obtain</label>
                  <input
                    id="class_obtain"
                    name="class_obtain"
                    value={form.class_obtain}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="course_language">Language</label>
                  <input
                    id="course_language"
                    name="course_language"
                    value={form.course_language}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="dg_rec_no">DG Rec No</label>
                  <input
                    id="dg_rec_no"
                    name="dg_rec_no"
                    value={form.dg_rec_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="dg_gender">Gender</label>
                  <input
                    id="dg_gender"
                    name="dg_gender"
                    value={form.dg_gender}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="convocation_no">Convocation No</label>
                  <input
                    id="convocation_no"
                    name="convocation_no"
                    value={form.convocation_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  disabled={!canSave}
                  onClick={onSave}
                  style={{
                    opacity: canSave ? 1 : 0.6,
                    padding: '8px 12px',
                    background: '#198754',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  <FaSave /> Save
                </button>
              </div>
            </>
          )}

          {(panelMode === 'search' || panelMode === 'report') && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
                  gap: 6,
                }}
              >
                <div>
                  <label htmlFor="search_q">Search</label>
                  <input
                    id="search_q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="border p-2 w-full"
                    placeholder="enroll/name/degree"
                  />
                </div>
                <div>
                  <label htmlFor="filter_degree">Degree</label>
                  <input
                    id="filter_degree"
                    value={filters.degree_name}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, degree_name: e.target.value }))
                    }
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="filter_year">Year</label>
                  <input
                    id="filter_year"
                    value={filters.year}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, year: e.target.value }))
                    }
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="filter_convocation">Convocation</label>
                  <input
                    id="filter_convocation"
                    value={filters.convocation_no}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        convocation_no: e.target.value,
                      }))
                    }
                    className="border p-2 w-full"
                  />
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {panelMode === 'search' && (
                  <button
                    onClick={load}
                    style={{
                      padding: '8px 12px',
                      background: '#0d6efd',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                    }}
                  >
                    <FaSearch /> Apply
                  </button>
                )}
                {panelMode === 'report' && (
                  <>
                    <button
                      onClick={() => downloadCsv(items)}
                      style={{
                        padding: '8px 12px',
                        background: '#17a2b8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                      }}
                    >
                      <FaFileCsv /> Download CSV
                    </button>
                    <button
                      onClick={onReportPdf}
                      style={{
                        padding: '8px 12px',
                        background: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                      }}
                    >
                      <FaFilePdf /> Open PDF
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const records = (
    <div className="border rounded overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">Enroll</th>
            <th className="px-3 py-2 text-left">Student</th>
            <th className="px-3 py-2 text-left">Degree</th>
            <th className="px-3 py-2 text-left">Spec</th>
            <th className="px-3 py-2 text-left">Year</th>
            <th className="px-3 py-2 text-left">Convocation</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.id}
              className="border-t hover:bg-gray-50 cursor-pointer"
              onClick={() => onEdit(row)}
            >
              <td className="px-3 py-2">{row.enrollment_no || '-'}</td>
              <td className="px-3 py-2">{row.student_name_dg || '-'}</td>
              <td className="px-3 py-2">{row.degree_name || '-'}</td>
              <td className="px-3 py-2">{row.specialisation || '-'}</td>
              <td className="px-3 py-2">{row.last_exam_year || '-'}</td>
              <td className="px-3 py-2">{row.convocation_no || '-'}</td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td className="px-3 py-4 text-gray-500" colSpan={6}>
                No results
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <PageLayout
      icon={
        <span aria-hidden className="text-2xl">
          🎓
        </span>
      }
      title="Degree"
      actions={actions}
      card={false}
      contentClassName="space-y-4"
    >
      {formPanel}
      {records}
    </PageLayout>
  );
}
