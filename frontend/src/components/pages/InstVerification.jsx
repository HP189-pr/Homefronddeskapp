import React, { useEffect, useMemo, useState } from 'react';
import { FaHome, FaPlus, FaSearch, FaSave } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

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

  const canSave = useMemo(() => {
    if (!form.doc_rec_date) return false;
    return true;
  }, [form]);

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    const res = await authFetch(`/api/admin/institutionals?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  };

  useEffect(() => { load(); }, []);

  const onHome = () => {
    window.dispatchEvent(new CustomEvent('app:home'));
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({ ...initialForm, ...row, doc_rec_date: row.doc_rec_date || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onReset = () => { setForm(initialForm); setEditingId(null); };

  const onSave = async () => {
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/institutionals/${editingId}` : '/api/admin/institutionals';
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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button title="Home" onClick={onHome} style={{ padding: '8px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaHome /> Home
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>🏛️ Institutional Verification</h1>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onReset} style={{ padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaPlus /> Add New
        </button>
        <button onClick={load} style={{ padding: '8px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaSearch /> Search
        </button>
      </div>

            <DateInputDMY name="doc_rec_date" value={form.doc_rec_date} onChange={onChange} className="border p-2 w-full" />
      <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
          <div>
            <label>Date</label>
            <input type="date" name="doc_rec_date" value={form.doc_rec_date} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>IV Year Auto No</label>
            <input type="text" name="ivyearautonumber" value={form.ivyearautonumber} onChange={onChange} placeholder="auto" className="border p-2 w-full" />
          </div>
          <div>
            <label>Institute Name</label>
            <input type="text" name="institution_name" value={form.institution_name} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Address1</label>
            <input type="text" name="address1" value={form.address1} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Address2</label>
            <input type="text" name="address2" value={form.address2} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Address3</label>
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
            <label>Status</label>
            <select name="status" value={form.status} onChange={onChange} className="border p-2 w-full">
              <option value="pending">pending</option>
              <option value="done">done</option>
              <option value="cancel">cancel</option>
              <option value="correction">correction</option>
              <option value="fake">fake</option>
            </select>
          </div>
          <div>
            <label>Final Number</label>
            <input type="text" name="institutional_verification_number" value={form.institutional_verification_number} onChange={onChange} placeholder="auto on done" className="border p-2 w-full" />
          </div>
          <div>
            <label>Mail/Post</label>
            <select name="mail_or_post" value={form.mail_or_post} onChange={onChange} className="border p-2 w-full">
              <option value="">--</option>
              <option value="mail">mail</option>
              <option value="post">post</option>
            </select>
          </div>
          <div>
            <label>Mail/Post Date</label>
            <input type="date" name="mail_or_post_date" value={form.mail_or_post_date} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Payment Receipt No</label>
            <input type="text" name="payment_receipt_no" value={form.payment_receipt_no} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Enrollment No</label>
            <input type="text" name="enrollment_no" value={form.enrollment_no} onChange={onChange} className="border p-2 w-full" />
          </div>
          <div>
            <label>Student Name</label>
            <input type="text" name="studentname" value={form.studentname} onChange={onChange} className="border p-2 w-full" />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={!canSave} onClick={onSave} style={{ opacity: canSave ? 1 : 0.6, padding: '8px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4 }}>
            <FaSave /> Save
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search..." value={q} onChange={(e)=>setQ(e.target.value)} className="border p-2" />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border p-2">
          <option value="">All Status</option>
          <option value="pending">pending</option>
          <option value="done">done</option>
          <option value="cancel">cancel</option>
          <option value="correction">correction</option>
          <option value="fake">fake</option>
        </select>
        <button onClick={load} style={{ padding: '8px 12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4 }}>
          <FaSearch /> Apply
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {items.map((row) => (
          <div key={row.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{row.institution_name || '(no name)'}</strong>
              <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: '#f1f3f5' }}>{row.status}</span>
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>
              <div>IV Year#: {row.ivyearautonumber || '-'}</div>
              <div>Final#: {row.institutional_verification_number || '-'}</div>
              <div>City: {row.city || '-'}</div>
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
}
