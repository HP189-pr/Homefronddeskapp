import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FaPlus,
  FaSearch,
  FaSave,
  FaChevronUp,
  FaChevronDown,
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { formatDateDMY } from '../../utils/date';
import DateInputDMY from '../common/DateInputDMY';
import PageLayout from './PageLayout';

const initialForm = {
  doc_rec_date: '',
  apply_for: 'VR',
  doc_rec_id: '',
  pay_by: 'NA',
  pay_rec_no_pre: '',
  pay_rec_no: '',
  pay_amount: '',
  // Verification-specific
  enrollment_id: '',
  second_enrollment_id: '',
  student_name: '',
  no_of_transcript: 0,
  no_of_marksheet: 0,
  no_of_degree: 0,
  no_of_moi: 0,
  no_of_backlog: 0,
  eca_required: false,
  // Institutional-specific
  rec_inst_name: '',
  // GT-specific (optional)
  gtmyearautonumber: '',
  // Shared remark
  doc_rec_remark: '',
};

const docTypeOptions = [
  { label: 'Verification', value: 'VR' },
  { label: 'Provisional', value: 'PR' },
  { label: 'Migration', value: 'MG' },
  { label: 'Institutional Verification', value: 'IV' },
  { label: 'Grade to Marks', value: 'GT' },
];

export default function DocumentReceive() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const enrollDebounceRef = useRef();
  const duplicateDebounceRef = useRef();
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelMode, setPanelMode] = useState('addEdit');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const canSave = useMemo(() => {
    const base =
      !!form.doc_rec_date &&
      !!form.apply_for &&
      !!form.doc_rec_id &&
      !!form.pay_by;
    const needsDupCheck = form.apply_for === 'PR' || form.apply_for === 'MG';
    const blocked = needsDupCheck && !!duplicateWarning;
    return base && !blocked;
  }, [form, duplicateWarning]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (filterType) params.set('apply_for', filterType);
    // try to fetch many rows; backend supports limit param
    params.set('limit', '1000');
    const res = await authFetch(`/api/admin/doc-receipts?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }, [authFetch, q, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-generate doc_rec_id when apply_for or date changes and doc_rec_id is empty
  useEffect(() => {
    const run = async () => {
      if (!form.apply_for || !form.doc_rec_date) return;
      if (
        form.doc_rec_id &&
        form.doc_rec_id.startsWith(`${form.apply_for.toLowerCase()}_`)
      )
        return;
      try {
        const params = new URLSearchParams();
        params.set('apply_for', form.apply_for);
        params.set('doc_rec_date', form.doc_rec_date);
        const res = await authFetch(
          `/api/admin/doc-receipts/next-id?${params.toString()}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.next_id)
            setForm((p) => ({ ...p, doc_rec_id: data.next_id }));
        }
      } catch {
        /* ignore */
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.apply_for, form.doc_rec_date]);
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
    setForm((p) => ({ ...p, apply_for: value }));
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onReset = () => {
    setForm(initialForm);
    setEditingId(null);
    setDuplicateWarning('');
  };

  const onSave = async () => {
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId
      ? `/api/admin/doc-receipts/${editingId}`
      : '/api/admin/doc-receipts';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const saved = await res.json().catch(() => null);
      await load();
      onReset();

      // Build a service focus so the target page can show this record immediately
      const focus = { type: form.apply_for };
      if (saved) {
        focus.doc_rec_id = saved.doc_rec_id;
        if (form.enrollment_id) focus.enrollment_no = form.enrollment_id;
      }
      try {
        sessionStorage.setItem('service_focus', JSON.stringify(focus));
      } catch (err) {
        void err; // ignore storage errors
      }

      // After saving, navigate to the corresponding page for the doc type
      const menuLabelForDocType = (t) => {
        switch ((t || '').toUpperCase()) {
          case 'VR':
            return '📜 Transcript';
          case 'MG':
            return '🚀 Migration';
          case 'PR':
            return '📄 Provisional';
          case 'IV':
            return '🏛️ Institutional Verification';
          default:
            return null;
        }
      };
      const label = menuLabelForDocType(form.apply_for);
      if (label) {
        window.dispatchEvent(
          new CustomEvent('app:setMenu', { detail: { label, meta: focus } }),
        );
      }
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Save failed');
    }
  };

  // Auto-fill student name when enrollment_id changes (debounced)
  useEffect(() => {
    if (!form.enrollment_id) return;
    if (enrollDebounceRef.current) clearTimeout(enrollDebounceRef.current);
    enrollDebounceRef.current = setTimeout(async () => {
      try {
        const res = await authFetch(
          `/api/enrollments?q=${encodeURIComponent(form.enrollment_id)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const list = data.items || data.rows || data || [];
          if (Array.isArray(list) && list.length) {
            const s = list[0];
            setForm((p) => ({
              ...p,
              student_name: s.studentname || s.student_name || p.student_name,
            }));
          }
        }
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      if (enrollDebounceRef.current) clearTimeout(enrollDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.enrollment_id]);

  // Duplicate enrollment check for PR/MG
  useEffect(() => {
    // reset warning by default
    setDuplicateWarning('');
    const type = form.apply_for;
    const enroll = (form.enrollment_id || '').trim();
    if (!(type === 'PR' || type === 'MG')) return;
    if (!enroll) return;
    if (duplicateDebounceRef.current) {
      clearTimeout(duplicateDebounceRef.current);
    }
    duplicateDebounceRef.current = setTimeout(async () => {
      try {
        const endpoint =
          type === 'PR' ? '/api/admin/provisionals' : '/api/admin/migrations';
        const params = new URLSearchParams({
          enrollment_no: enroll,
          limit: '10',
        });
        const res = await authFetch(`${endpoint}?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.items || data.rows || data || [];
        if (!Array.isArray(list) || list.length === 0) {
          setDuplicateWarning('');
          return;
        }
        // Determine statuses; prefer normalized 'status', else raw mg_status/prv_status
        const statuses = list.map((it) =>
          String(it.status || it.mg_status || it.prv_status || '')
            .toLowerCase()
            .trim(),
        );
        const allCancelled =
          statuses.length > 0 && statuses.every((s) => s === 'cancelled');
        // Treat anything not-cancelled as blocked (includes '', 'done', 'pending', etc.) per spec allowing only cancelled
        if (allCancelled) {
          setDuplicateWarning('');
        } else {
          setDuplicateWarning('Duplicate enrollment: action not allowed');
        }
      } catch {
        // on errors, do not block save artificially
        setDuplicateWarning('');
      }
    }, 400);
    return () => {
      if (duplicateDebounceRef.current) {
        clearTimeout(duplicateDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.apply_for, form.enrollment_id]);

  const showVerification = form.apply_for === 'VR';
  const showProvisional = form.apply_for === 'PR';
  const showMigration = form.apply_for === 'MG';
  const showInstitutional = form.apply_for === 'IV';
  const showGtm = form.apply_for === 'GT';

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
        <FaPlus className="text-sm" /> Add New
      </button>
      <button
        type="button"
        onClick={() => setPanelOpen((p) => !p)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-gray-600 text-white shadow-sm hover:bg-gray-500"
      >
        {panelOpen ? <FaChevronUp /> : <FaChevronDown />}{' '}
        {panelOpen ? 'Collapse' : 'Expand'}
      </button>
      <button
        type="button"
        onClick={load}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-500"
      >
        <FaSearch className="text-sm" /> Search
      </button>
    </div>
  );

  const formPanel = (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
        <div className="text-base font-semibold capitalize text-gray-700">
          {panelMode === 'addEdit' ? 'Entry Panel' : 'Search Panel'}
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          {panelOpen ? <FaChevronUp /> : <FaChevronDown />}
          {panelOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {panelOpen && (
        <div className="p-4">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="doc_rec_date">Date</label>
              <DateInputDMY
                id="doc_rec_date"
                name="doc_rec_date"
                value={form.doc_rec_date}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="apply_for">Apply For</label>
              <select
                name="apply_for"
                id="apply_for"
                value={form.apply_for}
                onChange={onTypeChange}
                className="border p-2 w-full"
              >
                {docTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {!!form.apply_for && (
              <div>
                <label htmlFor="doc_rec_id">Doc Receipt ID</label>
                <input
                  type="text"
                  name="doc_rec_id"
                  id="doc_rec_id"
                  value={form.doc_rec_id}
                  onChange={onChange}
                  className="border p-2 w-full"
                />
              </div>
            )}
            <div>
              <label htmlFor="pay_by">Pay By</label>
              <select
                name="pay_by"
                id="pay_by"
                value={form.pay_by}
                onChange={onChange}
                className="border p-2 w-full"
              >
                <option value="CASH">CASH</option>
                <option value="BANK">BANK</option>
                <option value="UPI">UPI</option>
                <option value="NA">NA</option>
              </select>
            </div>
            <div>
              <label htmlFor="pay_rec_no_pre">Receipt Prefix</label>
              <input
                type="text"
                name="pay_rec_no_pre"
                id="pay_rec_no_pre"
                value={form.pay_rec_no_pre}
                onChange={onChange}
                disabled={form.pay_by === 'NA'}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="pay_rec_no">Receipt Number</label>
              <input
                type="text"
                name="pay_rec_no"
                id="pay_rec_no"
                value={form.pay_rec_no}
                onChange={onChange}
                disabled={form.pay_by === 'NA'}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="pay_amount">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="pay_amount"
                id="pay_amount"
                value={form.pay_amount}
                onChange={onChange}
                disabled={form.pay_by === 'NA'}
                className="border p-2 w-full"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="doc_rec_remark">Remark</label>
              <input
                type="text"
                name="doc_rec_remark"
                id="doc_rec_remark"
                value={form.doc_rec_remark}
                onChange={onChange}
                placeholder="remark for this receipt (shared)"
                className="border p-2 w-full"
              />
            </div>

            {showVerification && (
              <>
                <div>
                  <label htmlFor="enrollment_id">Enrollment No</label>
                  <input
                    type="text"
                    name="enrollment_id"
                    id="enrollment_id"
                    value={form.enrollment_id}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="second_enrollment_id">
                    Second Enrollment
                  </label>
                  <input
                    type="text"
                    name="second_enrollment_id"
                    id="second_enrollment_id"
                    value={form.second_enrollment_id}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="student_name">Student Name</label>
                  <input
                    type="text"
                    name="student_name"
                    id="student_name"
                    value={form.student_name}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="no_of_transcript">No. of Transcript</label>
                  <input
                    type="number"
                    name="no_of_transcript"
                    id="no_of_transcript"
                    value={form.no_of_transcript}
                    onChange={onChangeNum}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="no_of_marksheet">No. of Marksheet</label>
                  <input
                    type="number"
                    name="no_of_marksheet"
                    id="no_of_marksheet"
                    value={form.no_of_marksheet}
                    onChange={onChangeNum}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="no_of_degree">No. of Degree</label>
                  <input
                    type="number"
                    name="no_of_degree"
                    id="no_of_degree"
                    value={form.no_of_degree}
                    onChange={onChangeNum}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="no_of_moi">No. of MOI</label>
                  <input
                    type="number"
                    name="no_of_moi"
                    id="no_of_moi"
                    value={form.no_of_moi}
                    onChange={onChangeNum}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="no_of_backlog">No. of Backlog</label>
                  <input
                    type="number"
                    name="no_of_backlog"
                    id="no_of_backlog"
                    value={form.no_of_backlog}
                    onChange={onChangeNum}
                    className="border p-2 w-full"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    id="eca_required"
                    type="checkbox"
                    name="eca_required"
                    checked={!!form.eca_required}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, eca_required: e.target.checked }))
                    }
                  />
                  <label htmlFor="eca_required">ECA required</label>
                </div>
              </>
            )}

            {showMigration && (
              <>
                <div>
                  <label htmlFor="enrollment_id">Enrollment No</label>
                  <input
                    type="text"
                    name="enrollment_id"
                    id="enrollment_id"
                    value={form.enrollment_id}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="student_name">Student Name</label>
                  <input
                    type="text"
                    name="student_name"
                    id="student_name"
                    value={form.student_name}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                {!!duplicateWarning && (
                  <div className="text-red-600 text-sm col-span-full">
                    {duplicateWarning}
                  </div>
                )}
                <div className="text-sm text-gray-500 col-span-full">
                  Migration details will be captured on its page.
                </div>
              </>
            )}
            {showProvisional && (
              <>
                <div>
                  <label htmlFor="enrollment_id">Enrollment No</label>
                  <input
                    type="text"
                    name="enrollment_id"
                    id="enrollment_id"
                    value={form.enrollment_id}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="student_name">Student Name</label>
                  <input
                    type="text"
                    name="student_name"
                    id="student_name"
                    value={form.student_name}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                {!!duplicateWarning && (
                  <div className="text-red-600 text-sm col-span-full">
                    {duplicateWarning}
                  </div>
                )}
                <div className="text-sm text-gray-500 col-span-full">
                  Provisional details will be captured on its page.
                </div>
              </>
            )}

            {showInstitutional && (
              <div>
                <label htmlFor="rec_inst_name">Institution Name</label>
                <input
                  type="text"
                  name="rec_inst_name"
                  id="rec_inst_name"
                  value={form.rec_inst_name}
                  onChange={onChange}
                  className="border p-2 w-full"
                />
              </div>
            )}

            {showGtm && (
              <>
                <div>
                  <label htmlFor="enrollment_id">Enrollment No</label>
                  <input
                    type="text"
                    name="enrollment_id"
                    id="enrollment_id"
                    value={form.enrollment_id}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="student_name">Student Name</label>
                  <input
                    type="text"
                    name="student_name"
                    id="student_name"
                    value={form.student_name}
                    onChange={onChange}
                    className="border p-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="gtmyearautonumber">GTM Year Auto No</label>
                  <input
                    type="text"
                    name="gtmyearautonumber"
                    id="gtmyearautonumber"
                    value={form.gtmyearautonumber}
                    onChange={onChange}
                    placeholder="auto if blank"
                    className="border p-2 w-full"
                  />
                </div>
              </>
            )}
            {/* End grid container */}
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
        </div>
      )}
    </div>
  );

  const filtersBar = (
    <div
      style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
    >
      <input
        placeholder="Search..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="border p-2"
      />
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        className="border p-2"
      >
        <option value="">All Types</option>
        {docTypeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {/* No status filter on doc_rec */}
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
    </div>
  );

  const records = (
    <div className="border rounded overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Apply For</th>
            <th className="px-3 py-2 text-left">Doc Rec ID</th>
            <th className="px-3 py-2 text-left">Payment</th>
            <th className="px-3 py-2 text-left">Remark</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const payment =
              row.pay_by === 'NA'
                ? 'NA'
                : `${row.pay_rec_no_pre || ''}${row.pay_rec_no || ''} (${
                    row.pay_by
                  })`;
            return (
              <tr
                key={row.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => onEdit(row)}
              >
                <td className="px-3 py-2">
                  {row.doc_rec_date ? formatDateDMY(row.doc_rec_date) : '-'}
                </td>
                <td className="px-3 py-2">{row.apply_for}</td>
                <td className="px-3 py-2">{row.doc_rec_id}</td>
                <td className="px-3 py-2">{payment}</td>
                <td className="px-3 py-2">{row.doc_rec_remark || '-'}</td>
              </tr>
            );
          })}
          {!items.length && (
            <tr>
              <td className="px-3 py-4 text-gray-500" colSpan={7}>
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
          📥
        </span>
      }
      title="Document Receive"
      actions={actions}
      card={false}
      contentClassName="space-y-4"
    >
      {formPanel}
      {filtersBar}
      {records}
    </PageLayout>
  );
}
