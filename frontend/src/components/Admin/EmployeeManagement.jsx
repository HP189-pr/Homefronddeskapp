import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const emptyForm = {
  id: null,
  emp_id: '',
  emp_name: '',
  emp_designation: '',
  institute_id: '',
  userid: '',
  leave_group: '',
  status: 'Active',
};

const EmployeeManagement = () => {
  const { authFetch } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => a.emp_name.localeCompare(b.emp_name));
  }, [profiles]);

  const loadProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/empprofile/', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? `Unable to load employee profiles: ${error.message}`
          : 'Unable to load employee profiles.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (profile) => {
    setForm({
      id: profile.id,
      emp_id: profile.emp_id ?? '',
      emp_name: profile.emp_name ?? '',
      emp_designation: profile.emp_designation ?? '',
      institute_id: profile.institute_id ?? '',
      userid: profile.userid ?? '',
      leave_group: profile.leave_group ?? '',
      status: profile.status ?? 'Active',
    });
  };

  const handleReset = () => {
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.emp_id || !form.emp_name) {
      setError('Employee ID and name are required.');
      return;
    }
    setLoading(true);
    setError('');
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/empprofile/${form.id}` : '/api/empprofile/';
    try {
      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          emp_id: form.emp_id,
          emp_name: form.emp_name,
          emp_designation: form.emp_designation || null,
          institute_id: form.institute_id || null,
          userid: form.userid || null,
          leave_group: form.leave_group || null,
          status: form.status || 'Active',
        }),
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      await loadProfiles();
      handleReset();
    } catch (error) {
      setError(
        error instanceof Error
          ? `Unable to save employee profile: ${error.message}`
          : 'Unable to save employee profile.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Employee Management</h3>
          <p className="text-sm text-gray-500">
            Maintain employee profiles used for leave workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProfiles}
          className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm"
        >
          Refresh
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-3"
      >
        <div className="flex flex-col">
          <label className="text-xs font-medium" htmlFor="employee-id">
            Employee ID*
          </label>
          <input
            id="employee-id"
            name="emp_id"
            value={form.emp_id}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
            placeholder="E001"
            required
          />
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-xs font-medium" htmlFor="employee-name">
            Employee Name*
          </label>
          <input
            id="employee-name"
            name="emp_name"
            value={form.emp_name}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium" htmlFor="employee-designation">
            Designation
          </label>
          <input
            id="employee-designation"
            name="emp_designation"
            value={form.emp_designation}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
            placeholder="HR Manager"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium" htmlFor="employee-institute">
            Institute
          </label>
          <input
            id="employee-institute"
            name="institute_id"
            value={form.institute_id}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
            placeholder="INST01"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium" htmlFor="employee-userid">
            User ID
          </label>
          <input
            id="employee-userid"
            name="userid"
            value={form.userid}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
            placeholder="employee.user"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium" htmlFor="employee-group">
            Leave Group
          </label>
          <input
            id="employee-group"
            name="leave_group"
            value={form.leave_group}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
            placeholder="Group A"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium" htmlFor="employee-status">
            Status
          </label>
          <select
            id="employee-status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-9 items-center justify-center rounded bg-blue-600 px-3 text-sm text-white"
          >
            {form.id ? 'Update Employee' : 'Add Employee'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-9 items-center justify-center rounded bg-gray-200 px-3 text-sm"
          >
            Clear
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="overflow-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Emp ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Designation</th>
              <th className="px-3 py-2 text-left">Institute</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProfiles.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-gray-500" colSpan={6}>
                  {loading
                    ? 'Loading profiles…'
                    : 'No employee profiles found.'}
                </td>
              </tr>
            ) : (
              sortedProfiles.map((profile) => (
                <tr key={profile.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{profile.emp_id}</td>
                  <td className="px-3 py-2">{profile.emp_name}</td>
                  <td className="px-3 py-2">
                    {profile.emp_designation || '—'}
                  </td>
                  <td className="px-3 py-2">{profile.institute_id || '—'}</td>
                  <td className="px-3 py-2">{profile.status || 'Active'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(profile)}
                      className="rounded border bg-white px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeManagement;
