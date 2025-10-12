import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaSearch,
  FaSave,
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import DateInputDMY from '../common/DateInputDMY';
import PageLayout from './PageLayout';

const initialForm = {
  doc_rec_date: '',
  ivyearautonumber: '',
  institution_name: '',
  address1: '',
  address2: '',
  address3: '',
  city: '',
  pincode: '',
  mobile: '',
  email: '',
  status: 'pending',
  institutional_verification_number: '',
  mail_or_post: '',
  mail_or_post_date: '',
  payment_receipt_no: '',
  enrollment_no: '',
  studentname: '',
};

export default function InstitutionalVerification() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelMode, setPanelMode] = useState('addEdit');

  const canSave = useMemo(() => !!form.doc_rec_date, [form]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    const res = await authFetch(
      `/api/admin/institutionals?${params.toString()}`,
    );
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }, [authFetch, q, status]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' });
    setPanelMode('addEdit');
    setPanelOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onReset = () => {
    setForm(initialForm);
    setEditingId(null);
  };
  const onSave = async () => {
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId
      ? `/api/admin/institutionals/${editingId}`
      : '/api/admin/institutionals';
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await load();
      onReset();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Save failed');
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
        <FaPlus className="text-sm" /> Add New
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
              <label htmlFor="ivyearautonumber">IV Year Auto No</label>
              <input
                type="text"
                name="ivyearautonumber"
                id="ivyearautonumber"
                value={form.ivyearautonumber}
                onChange={onChange}
                placeholder="auto"
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="institution_name">Institute Name</label>
              <input
                type="text"
                name="institution_name"
                id="institution_name"
                value={form.institution_name}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="address1">Address1</label>
              <input
                type="text"
                name="address1"
                id="address1"
                value={form.address1}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="address2">Address2</label>
              <input
                type="text"
                name="address2"
                id="address2"
                value={form.address2}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="address3">Address3</label>
              <input
                type="text"
                name="address3"
                id="address3"
                value={form.address3}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="city">City</label>
              <input
                type="text"
                name="city"
                id="city"
                value={form.city}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="pincode">Pincode</label>
              <input
                type="text"
                name="pincode"
                id="pincode"
                value={form.pincode}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="mobile">Mobile</label>
              <input
                type="text"
                name="mobile"
                id="mobile"
                value={form.mobile}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={form.email}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="status">Status</label>
              <select
                name="status"
                id="status"
                value={form.status}
                onChange={onChange}
                className="border p-2 w-full"
              >
                <option value="pending">pending</option>
                <option value="done">done</option>
                <option value="cancel">cancel</option>
                <option value="correction">correction</option>
                <option value="fake">fake</option>
              </select>
            </div>
            <div>
              <label htmlFor="institutional_verification_number">
                Final Number
              </label>
              <input
                type="text"
                name="institutional_verification_number"
                id="institutional_verification_number"
                value={form.institutional_verification_number}
                onChange={onChange}
                placeholder="auto on done"
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="mail_or_post">Mail/Post</label>
              <select
                name="mail_or_post"
                id="mail_or_post"
                value={form.mail_or_post}
                onChange={onChange}
                className="border p-2 w-full"
              >
                <option value="">--</option>
                <option value="mail">mail</option>
                <option value="post">post</option>
              </select>
            </div>
            <div>
              <label htmlFor="mail_or_post_date">Mail/Post Date</label>
              <input
                type="date"
                name="mail_or_post_date"
                id="mail_or_post_date"
                value={form.mail_or_post_date}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="payment_receipt_no">Payment Receipt No</label>
              <input
                type="text"
                name="payment_receipt_no"
                id="payment_receipt_no"
                value={form.payment_receipt_no}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="enrollment_no">Enrollment No</label>
              <input
                type="text"
                name="enrollment_no"
                id="enrollment_no"
                value={form.enrollment_no}
                onChange={onChange}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label htmlFor="studentname">Student Name</label>
              <input
                type="text"
                name="studentname"
                id="studentname"
                value={form.studentname}
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
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border p-2"
      >
        <option value="">All Status</option>
        <option value="pending">pending</option>
        <option value="done">done</option>
        <option value="cancel">cancel</option>
        <option value="correction">correction</option>
        <option value="fake">fake</option>
      </select>
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

  const recordsGrid = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12,
      }}
    >
      {items.map((row) => (
        <div
          key={row.id}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong>{row.institution_name || '(no name)'}</strong>
            <span
              style={{
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#f1f3f5',
              }}
            >
              {row.status}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            <div>IV Year#: {row.ivyearautonumber || '-'}</div>
            <div>Final#: {row.institutional_verification_number || '-'}</div>
            <div>Enroll: {row.enrollment_no || '-'}</div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button
              onClick={() => onEdit(row)}
              style={{
                padding: '6px 10px',
                background: '#ffc107',
                border: 'none',
                borderRadius: 4,
              }}
            >
              Edit
            </button>
          </div>
        </div>
      ))}
      {!items.length && <div style={{ opacity: 0.7 }}>No results</div>}
    </div>
  );

  return (
    <PageLayout
      icon={
        <span aria-hidden className="text-2xl">
          🏛️
        </span>
      }
      title="Institutional Verification"
      actions={actions}
      card={false}
      contentClassName="space-y-4"
    >
      {formPanel}
      {filtersBar}
      {recordsGrid}
    </PageLayout>
  );
}
