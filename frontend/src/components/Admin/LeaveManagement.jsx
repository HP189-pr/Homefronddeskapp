import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const emptyType = {
  leave_code: '',
  leave_name: '',
  description: '',
  is_active: true,
};
const emptyPeriod = {
  id: null,
  name: '',
  start_date: '',
  end_date: '',
  is_active: false,
};
const emptyAllocation = {
  profile_id: '',
  period_id: '',
  leave_type_code: '',
  allocated: '',
  carried_forward: '',
};

const LeaveManagement = () => {
  const { authFetch } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [typeForm, setTypeForm] = useState(emptyType);
  const [periodForm, setPeriodForm] = useState(emptyPeriod);
  const [allocationForm, setAllocationForm] = useState(emptyAllocation);
  const [message, setMessage] = useState('');

  const activePeriod = useMemo(
    () => periods.find((p) => p.is_active),
    [periods],
  );

  const fetchJson = async (url, options) => {
    const res = await authFetch(url, {
      headers: { Accept: 'application/json', ...(options?.headers || {}) },
      ...options,
    });
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);
    return res.json();
  };

  const loadLeaveTypes = async () => {
    const data = await fetchJson('/api/leavetype/');
    setLeaveTypes(Array.isArray(data) ? data : []);
  };

  const loadLeavePeriods = async () => {
    const data = await fetchJson('/api/leave-periods/');
    setPeriods(Array.isArray(data) ? data : []);
    const activeId = data?.find((p) => p.is_active)?.id;
    if (activeId) setSelectedPeriodId(String(activeId));
  };

  const loadAllocations = async (periodIdParam) => {
    const periodId = periodIdParam || selectedPeriodId || activePeriod?.id;
    if (!periodId) {
      setAllocations([]);
      return;
    }
    const query = new URLSearchParams({ period: periodId }).toString();
    const data = await fetchJson(`/api/leave-allocations/?${query}`);
    setAllocations(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.allSettled([loadLeaveTypes(), loadLeavePeriods()]).then(() => {
      loadAllocations();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPeriodId) loadAllocations(selectedPeriodId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodId]);

  const handleTypeChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTypeForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePeriodChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPeriodForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAllocationChange = (event) => {
    const { name, value } = event.target;
    setAllocationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateType = async (event) => {
    event.preventDefault();
    if (!typeForm.leave_code || !typeForm.leave_name) {
      setMessage('Leave code and name are required.');
      return;
    }
    try {
      await fetchJson('/api/leavetype/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm),
      });
      setTypeForm(emptyType);
      await loadLeaveTypes();
      setMessage('Leave type saved successfully.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to save leave type: ${error.message}`
          : 'Unable to save leave type.',
      );
    }
  };

  const handleCreatePeriod = async (event) => {
    event.preventDefault();
    if (!periodForm.name || !periodForm.start_date || !periodForm.end_date) {
      setMessage('All period fields are required.');
      return;
    }
    try {
      await fetchJson(
        periodForm.id
          ? `/api/leave-periods/${periodForm.id}`
          : '/api/leave-periods/',
        {
          method: periodForm.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(periodForm),
        },
      );
      setPeriodForm(emptyPeriod);
      await loadLeavePeriods();
      setMessage('Leave period saved successfully.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to save leave period: ${error.message}`
          : 'Unable to save leave period.',
      );
    }
  };

  const handleCreateAllocation = async (event) => {
    event.preventDefault();
    if (
      !allocationForm.profile_id ||
      !allocationForm.period_id ||
      !allocationForm.leave_type_code
    ) {
      setMessage('Allocation requires employee, period and leave type.');
      return;
    }
    try {
      await fetchJson('/api/leave-allocations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: Number(allocationForm.profile_id),
          period_id: Number(allocationForm.period_id),
          leave_type_code: allocationForm.leave_type_code,
          allocated: Number(allocationForm.allocated || 0),
          carried_forward: Number(allocationForm.carried_forward || 0),
        }),
      });
      setAllocationForm(emptyAllocation);
      await loadAllocations(allocationForm.period_id);
      setMessage('Leave allocation saved successfully.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to save allocation: ${error.message}`
          : 'Unable to save allocation.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-lg font-semibold">Leave Management</h3>
        <p className="text-sm text-gray-500">
          Configure leave types, periods, and allocations for employees.
        </p>
        {message && <p className="mt-2 text-sm text-indigo-600">{message}</p>}
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleCreateType}
          className="p-4 border rounded-lg bg-gray-50 space-y-3"
        >
          <h4 className="font-semibold text-sm">Add Leave Type</h4>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="leave_code">
              Leave Code*
            </label>
            <input
              id="leave_code"
              name="leave_code"
              value={typeForm.leave_code}
              onChange={handleTypeChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="EL"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="leave_name">
              Leave Name*
            </label>
            <input
              id="leave_name"
              name="leave_name"
              value={typeForm.leave_name}
              onChange={handleTypeChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Earned Leave"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="leave_description">
              Description
            </label>
            <input
              id="leave_description"
              name="description"
              value={typeForm.description}
              onChange={handleTypeChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Optional details"
            />
          </div>
          <label
            className="inline-flex items-center gap-2 text-xs"
            htmlFor="leave_active"
          >
            <input
              id="leave_active"
              type="checkbox"
              name="is_active"
              checked={typeForm.is_active}
              onChange={handleTypeChange}
            />
            Active
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white"
          >
            Save Type
          </button>
        </form>

        <form
          onSubmit={handleCreatePeriod}
          className="p-4 border rounded-lg bg-gray-50 space-y-3"
        >
          <h4 className="font-semibold text-sm">Add Leave Period</h4>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="period_name">
              Name*
            </label>
            <input
              id="period_name"
              name="name"
              value={periodForm.name}
              onChange={handlePeriodChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="FY 2025"
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col w-full">
              <label className="text-xs mb-1" htmlFor="period_start">
                Start Date*
              </label>
              <input
                id="period_start"
                type="date"
                name="start_date"
                value={periodForm.start_date}
                onChange={handlePeriodChange}
                className="border rounded px-2 py-1 text-sm"
                required
              />
            </div>
            <div className="flex flex-col w-full">
              <label className="text-xs mb-1" htmlFor="period_end">
                End Date*
              </label>
              <input
                id="period_end"
                type="date"
                name="end_date"
                value={periodForm.end_date}
                onChange={handlePeriodChange}
                className="border rounded px-2 py-1 text-sm"
                required
              />
            </div>
          </div>
          <label
            className="inline-flex items-center gap-2 text-xs"
            htmlFor="period_active"
          >
            <input
              id="period_active"
              type="checkbox"
              name="is_active"
              checked={periodForm.is_active}
              onChange={handlePeriodChange}
            />
            Mark as active period
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white"
          >
            Save Period
          </button>
        </form>
      </section>

      <section className="p-4 border rounded-lg bg-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm">Leave Allocations</h4>
            <p className="text-xs text-gray-500">
              View per employee usage for the selected period.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="allocation_period" className="text-xs font-medium">
              Period
            </label>
            <select
              id="allocation_period"
              value={selectedPeriodId}
              onChange={(event) => setSelectedPeriodId(event.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Select period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form
          onSubmit={handleCreateAllocation}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border"
        >
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="alloc_profile">
              Employee ID*
            </label>
            <input
              id="alloc_profile"
              name="profile_id"
              value={allocationForm.profile_id}
              onChange={handleAllocationChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Profile ID"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="alloc_period">
              Period ID*
            </label>
            <input
              id="alloc_period"
              name="period_id"
              value={allocationForm.period_id}
              onChange={handleAllocationChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Period ID"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="alloc_type">
              Leave Code*
            </label>
            <input
              id="alloc_type"
              name="leave_type_code"
              value={allocationForm.leave_type_code}
              onChange={handleAllocationChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="EL"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="alloc_amount">
              Allocation
            </label>
            <input
              id="alloc_amount"
              name="allocated"
              value={allocationForm.allocated}
              onChange={handleAllocationChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="12"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs mb-1" htmlFor="alloc_carry">
              Carry Forward
            </label>
            <input
              id="alloc_carry"
              name="carried_forward"
              value={allocationForm.carried_forward}
              onChange={handleAllocationChange}
              className="border rounded px-2 py-1 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white"
            >
              Save Allocation
            </button>
          </div>
        </form>

        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Employee</th>
                <th className="text-left px-3 py-2">Leave Type</th>
                <th className="text-left px-3 py-2">Allocated</th>
                <th className="text-left px-3 py-2">Used</th>
                <th className="text-left px-3 py-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    No allocations for the selected period.
                  </td>
                </tr>
              ) : (
                allocations.map((allocation) => (
                  <tr
                    key={`${allocation.profile_id}-${allocation.leave_type}`}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">{allocation.profile}</td>
                    <td className="px-3 py-2">{allocation.leave_type_name}</td>
                    <td className="px-3 py-2">{allocation.allocated}</td>
                    <td className="px-3 py-2">{allocation.used}</td>
                    <td className="px-3 py-2">{allocation.balance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="p-4 border rounded-lg bg-white space-y-2">
        <h4 className="font-semibold text-sm">Existing Leave Types</h4>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    No leave types defined yet.
                  </td>
                </tr>
              ) : (
                leaveTypes.map((type) => (
                  <tr key={type.id || type.leave_code} className="border-t">
                    <td className="px-3 py-2">{type.leave_code}</td>
                    <td className="px-3 py-2">{type.leave_name}</td>
                    <td className="px-3 py-2">
                      {type.is_active ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default LeaveManagement;
