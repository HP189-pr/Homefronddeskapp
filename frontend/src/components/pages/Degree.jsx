import React, { useEffect, useMemo, useState } from 'react';
import {
  FaPlus,
  FaSearch,
  FaSave,
  FaFileCsv,
  FaEdit,
  FaFilePdf,
} from 'react-icons/fa';
import axios from 'axios';
import { saveAs } from 'file-saver';

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
  const [panelOpen, setPanelOpen] = useState(false);
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

  const load = async () => {
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
    } catch (e) {
      setItems([]);
      alert(e?.response?.data?.error || e.message || 'Failed to fetch degrees');
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    } catch (e) {
      alert('PDF generation failed');
    }
  };

  return (
    <div style={{ padding: '8px 16px 16px 6px' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">Degree</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onReset();
              setPanelMode('addEdit');
              setPanelOpen(true);
            }}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            <FaPlus /> Add
          </button>
          <button
            onClick={() => {
              setPanelMode('search');
              setPanelOpen(true);
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            <FaSearch /> Search
          </button>
          <button
            onClick={() => {
              setPanelMode('report');
              setPanelOpen(true);
            }}
            className="px-3 py-1 bg-cyan-600 text-white rounded"
          >
            <FaFileCsv /> Report
          </button>
        </div>
      </div>

      {panelOpen && (
        <div
          style={{
            border: '1px solid #ddd',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-700 font-semibold capitalize">
              {panelMode === 'addEdit' ? 'Add / Edit' : panelMode}
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
            >
              ^
            </button>
          </div>

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
                  <label>DG Sr No</label>
                  <input
                    name="dg_sr_no"
                    value={form.dg_sr_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Enrollment</label>
                  <input
                    name="enrollment_no"
                    value={form.enrollment_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div style={{ gridColumn: 'auto / span 2' }}>
                  <label>Student Name</label>
                  <input
                    name="student_name_dg"
                    value={form.student_name_dg}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div style={{ gridColumn: 'auto / span 2' }}>
                  <label>Address</label>
                  <input
                    name="dg_address"
                    value={form.dg_address}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Institute</label>
                  <input
                    name="institute_name_dg"
                    value={form.institute_name_dg}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Degree</label>
                  <input
                    name="degree_name"
                    value={form.degree_name}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Specialisation</label>
                  <input
                    name="specialisation"
                    value={form.specialisation}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Seat (last exam)</label>
                  <input
                    name="seat_last_exam"
                    value={form.seat_last_exam}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Exam Month</label>
                  <input
                    name="last_exam_month"
                    value={form.last_exam_month}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Exam Year</label>
                  <input
                    name="last_exam_year"
                    value={form.last_exam_year}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Class Obtain</label>
                  <input
                    name="class_obtain"
                    value={form.class_obtain}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Language</label>
                  <input
                    name="course_language"
                    value={form.course_language}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>DG Rec No</label>
                  <input
                    name="dg_rec_no"
                    value={form.dg_rec_no}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Gender</label>
                  <input
                    name="dg_gender"
                    value={form.dg_gender}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Convocation No</label>
                  <input
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
                  <label>Search</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="border p-2 w-full"
                    placeholder="enroll/name/degree"
                  />
                </div>
                <div>
                  <label>Degree</label>
                  <input
                    value={filters.degree_name}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, degree_name: e.target.value }))
                    }
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Year</label>
                  <input
                    value={filters.year}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, year: e.target.value }))
                    }
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label>Convocation</label>
                  <input
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
    </div>
  );
}
