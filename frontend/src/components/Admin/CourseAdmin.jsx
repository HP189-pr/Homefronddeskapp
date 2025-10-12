// src/components/Admin/CourseAdmin.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const emptyMain = { maincourse_id: '', course_code: '', course_name: '' };
const emptySub = { subcourse_id: '', subcourse_name: '', maincourse_id: '' };

const CourseAdmin = () => {
  const { authFetch } = useAuth();
  const [mainList, setMainList] = useState([]);
  const [subList, setSubList] = useState([]);
  const [mainForm, setMainForm] = useState({ ...emptyMain });
  const [subForm, setSubForm] = useState({ ...emptySub });
  const [editingMainId, setEditingMainId] = useState(null); // primary key id
  const [editingSubId, setEditingSubId] = useState(null); // primary key id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mainById = useMemo(() => {
    const map = new Map();
    for (const m of mainList) map.set(String(m.maincourse_id ?? ''), m);
    return map;
  }, [mainList]);

  const load = async () => {
    try {
      setLoading(true);
      const [mRes, sRes] = await Promise.all([
        authFetch('/api/admin/course_main', { method: 'GET' }),
        authFetch('/api/admin/course_sub', { method: 'GET' }),
      ]);
      const [mData, sData] = await Promise.all([mRes.json(), sRes.json()]);
      setMainList(mData.course_main || []);
      setSubList(sData.course_sub || []);
    } catch (e) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onMainChange = (e) => {
    const { name, value } = e.target;
    setMainForm((p) => ({ ...p, [name]: value }));
  };
  const onSubChange = (e) => {
    const { name, value } = e.target;
    setSubForm((p) => ({ ...p, [name]: value }));
  };

  const resetMain = () => {
    setMainForm({ ...emptyMain });
    setEditingMainId(null);
    setError('');
  };
  const resetSub = () => {
    setSubForm({ ...emptySub });
    setEditingSubId(null);
    setError('');
  };

  const saveMain = async (e) => {
    e?.preventDefault?.();
    setError('');
    const payload = {
      maincourse_id: mainForm.maincourse_id
        ? Number(mainForm.maincourse_id)
        : undefined,
      course_code: mainForm.course_code?.trim() || undefined,
      course_name: mainForm.course_name?.trim() || undefined,
    };
    try {
      let res;
      if (editingMainId) {
        res = await authFetch(`/api/admin/course_main/${editingMainId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/api/admin/course_main', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error(await res.text());
      await load();
      resetMain();
    } catch (e) {
      setError(e.message || 'Failed to save main course');
    }
  };

  const saveSub = async (e) => {
    e?.preventDefault?.();
    setError('');
    const payload = {
      subcourse_id: subForm.subcourse_id
        ? Number(subForm.subcourse_id)
        : undefined,
      subcourse_name: subForm.subcourse_name?.trim() || undefined,
      maincourse_id: subForm.maincourse_id
        ? Number(subForm.maincourse_id)
        : undefined,
    };
    if (!payload.subcourse_name) return setError('Subcourse name is required');
    try {
      let res;
      if (editingSubId) {
        res = await authFetch(`/api/admin/course_sub/${editingSubId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/api/admin/course_sub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error(await res.text());
      await load();
      resetSub();
    } catch (e) {
      setError(e.message || 'Failed to save sub course');
    }
  };

  const startEditMain = (row) => {
    setEditingMainId(row.id);
    setMainForm({
      maincourse_id: row.maincourse_id ?? '',
      course_code: row.course_code ?? '',
      course_name: row.course_name ?? '',
    });
  };
  const startEditSub = (row) => {
    setEditingSubId(row.id);
    setSubForm({
      subcourse_id: row.subcourse_id ?? '',
      subcourse_name: row.subcourse_name ?? '',
      maincourse_id: row.maincourse_id ?? '',
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Course Management</h2>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Course Main */}
        <div className="bg-gray-50 border rounded p-4">
          <h3 className="font-semibold mb-3">Main Courses</h3>
          <form onSubmit={saveMain} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                name="maincourse_id"
                value={mainForm.maincourse_id}
                onChange={onMainChange}
                placeholder="Maincourse ID (optional)"
                className="p-2 border rounded"
              />
              <input
                name="course_code"
                value={mainForm.course_code}
                onChange={onMainChange}
                placeholder="Course code"
                className="p-2 border rounded"
              />
              <input
                name="course_name"
                value={mainForm.course_name}
                onChange={onMainChange}
                placeholder="Course name"
                className="p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded"
              >
                {editingMainId ? 'Update' : 'Add'} Main
              </button>
              {editingMainId && (
                <button
                  type="button"
                  onClick={resetMain}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="mt-4 border rounded overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Main ID</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-3 py-2" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  (mainList.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-gray-500" colSpan={5}>
                        No main courses
                      </td>
                    </tr>
                  ) : (
                    mainList.map((row, idx) => (
                      <tr className="border-t" key={row.id}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{row.maincourse_id}</td>
                        <td className="px-3 py-2">{row.course_code || '—'}</td>
                        <td className="px-3 py-2">{row.course_name || '—'}</td>
                        <td className="px-3 py-2">
                          <button
                            className="px-3 py-1 bg-white border rounded"
                            onClick={() => startEditMain(row)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Course Sub */}
        <div className="bg-gray-50 border rounded p-4">
          <h3 className="font-semibold mb-3">Sub Courses</h3>
          <form onSubmit={saveSub} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                name="subcourse_id"
                value={subForm.subcourse_id}
                onChange={onSubChange}
                placeholder="Subcourse ID (optional)"
                className="p-2 border rounded"
              />
              <input
                name="subcourse_name"
                value={subForm.subcourse_name}
                onChange={onSubChange}
                placeholder="Subcourse name"
                className="p-2 border rounded"
              />
              <select
                name="maincourse_id"
                value={subForm.maincourse_id}
                onChange={onSubChange}
                className="p-2 border rounded"
              >
                <option value="">Select Main Course (optional)</option>
                {mainList.map((m) => (
                  <option key={m.id} value={m.maincourse_id}>
                    {m.maincourse_id} —{' '}
                    {m.course_code || m.course_name || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded"
              >
                {editingSubId ? 'Update' : 'Add'} Sub
              </button>
              {editingSubId && (
                <button
                  type="button"
                  onClick={resetSub}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="mt-4 border rounded overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Sub ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Main</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-3 py-2" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  (subList.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-gray-500" colSpan={5}>
                        No sub courses
                      </td>
                    </tr>
                  ) : (
                    subList.map((row, idx) => {
                      const m = mainById.get(String(row.maincourse_id ?? ''));
                      const mainLabel = m
                        ? `${m.maincourse_id} — ${
                            m.course_code || m.course_name || 'Untitled'
                          }`
                        : '—';
                      return (
                        <tr className="border-t" key={row.id}>
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{row.subcourse_id}</td>
                          <td className="px-3 py-2">
                            {row.subcourse_name || '—'}
                          </td>
                          <td className="px-3 py-2">{mainLabel}</td>
                          <td className="px-3 py-2">
                            <button
                              className="px-3 py-1 bg-white border rounded"
                              onClick={() => startEditSub(row)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseAdmin;
