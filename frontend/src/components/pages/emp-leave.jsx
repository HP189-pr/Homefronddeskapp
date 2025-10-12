import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaUserTie } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import PageLayout from './PageLayout';
import axios from '../api/axiosInstance';

const EmpLeavePage = () => {
  const { user } = useAuth();
  const [leaveEntries, setLeaveEntries] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    emp_id: '',
    leave_type: '',
    leave_type_code: '',
    start_date: '',
    end_date: '',
    reason: '',
    total_days: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [myBalances, setMyBalances] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const PANELS = ['Entry Leave', 'Leave Report', 'Balance Certificate'];
  const [selectedPanel, setSelectedPanel] = useState(PANELS[0]);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    axios
      .get('/api/empprofile/')
      .then((r) => {
        setProfiles(r.data || []);
        const me = (r.data || []).find((p) => p.userid === user?.id);
        setProfile(me || null);
      })
      .catch(() => {
        setProfiles([]);
        setProfile(null);
      });

    axios
      .get('/api/leaveentry/')
      .then((r) => setLeaveEntries(r.data || []))
      .catch(() => setLeaveEntries([]));

    axios
      .get('/api/my-leave-balance/')
      .then((r) => setMyBalances(r.data || []))
      .catch(() => setMyBalances([]));
  }, [user]);

  useEffect(() => {
    // load allocations only when report panel is active
    if (selectedPanel === 'Leave Report') {
      axios
        .get('/api/leave-allocations/')
        .then((r) => setAllocations(r.data || []))
        .catch(() => setAllocations([]));
    }
  }, [selectedPanel]);

  const handleTopbarSelect = (panel) => {
    if (selectedPanel === panel) setPanelOpen((p) => !p);
    else {
      setSelectedPanel(panel);
      setPanelOpen(true);
    }
  };

  const parseDMY = (s) => {
    if (!s) return null;
    // yyyy-mm-dd (from date input)
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]),
        mo = Number(m[2]) - 1,
        d = Number(m[3]);
      const dt = new Date(y, mo, d);
      if (
        dt &&
        dt.getDate() === d &&
        dt.getMonth() === mo &&
        dt.getFullYear() === y
      )
        return dt;
      return null;
    }
    // dd-mm-yyyy or dd/mm/yyyy
    m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (m) {
      const d = Number(m[1]),
        mo = Number(m[2]) - 1,
        y = Number(m[3]);
      const dt = new Date(y, mo, d);
      if (
        dt &&
        dt.getDate() === d &&
        dt.getMonth() === mo &&
        dt.getFullYear() === y
      )
        return dt;
    }
    return null;
  };

  const computeTotalDays = (startStr, endStr) => {
    const a = parseDMY(startStr);
    const b = parseDMY(endStr);
    if (!a || !b) return '';
    const days = Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
    return String(Math.max(0, days));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'start_date' || name === 'end_date') {
        next.total_days = computeTotalDays(next.start_date, next.end_date);
      }
      return next;
    });
  };

  const toISO = (s) => {
    const d = parseDMY(s);
    if (!d) return s; // if invalid, return raw
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const empValue = form.emp_id || profile?.emp_id || profile?.id || '';
      // pick leave_type_code if provided else leave_type
      const leaveTypeValue = form.leave_type_code || form.leave_type;
      const payload = {
        emp: empValue,
        leave_type: leaveTypeValue,
        start_date: toISO(form.start_date),
        end_date: toISO(form.end_date),
        reason: form.reason,
      };
      await axios.post('/api/leaveentry/', payload);
      setForm({
        emp_id: '',
        leave_type: '',
        leave_type_code: '',
        start_date: '',
        end_date: '',
        reason: '',
        total_days: '',
      });
      const r = await axios.get('/api/leaveentry/');
      setLeaveEntries(r.data || []);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to apply for leave.';
      setError(message);
    }
    setLoading(false);
  };

  const filteredEntries = filterEmp
    ? leaveEntries.filter((le) => String(le.emp) === String(filterEmp))
    : leaveEntries;

  return (
    <PageLayout
      icon={<FaUserTie />}
      title="Leave Management"
      headerContent={
        <div className="flex flex-wrap items-center gap-2">
          {PANELS.map((panel) => (
            <button
              key={panel}
              className={`rounded border px-3 py-1.5 text-sm ${
                selectedPanel === panel
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
              onClick={() => handleTopbarSelect(panel)}
              type="button"
            >
              {panel === 'Entry Leave'
                ? 'Add'
                : panel === 'Leave Report'
                ? 'Report'
                : 'Balance'}
            </button>
          ))}
        </div>
      }
      card={false}
      contentClassName="space-y-4"
    >
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50 p-3">
          <div className="font-semibold">
            {selectedPanel ? `${selectedPanel} Panel` : 'Action Panel'}
          </div>
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            type="button"
          >
            {panelOpen ? <FaChevronUp /> : <FaChevronDown />}
            {panelOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {panelOpen && selectedPanel && (
          <div className="p-3">
            {selectedPanel === 'Entry Leave' && (
              <form
                onSubmit={handleApply}
                className="flex flex-wrap items-end gap-4 md:flex-nowrap"
              >
                <div className="flex flex-col">
                  <label htmlFor="emp-id" className="text-xs mb-1">
                    Emp ID
                  </label>
                  <input
                    id="emp-id"
                    type="text"
                    name="emp_id"
                    value={form.emp_id}
                    onChange={handleChange}
                    className="border rounded-lg p-2 text-sm w-20"
                    maxLength={3}
                    placeholder="123"
                    pattern="\\d{1,3}"
                  />
                </div>

                <div className="flex-1 min-w-[220px] flex flex-col">
                  <label className="text-xs mb-1" htmlFor="employee-name">
                    Employee Name
                  </label>
                  <input
                    id="employee-name"
                    type="text"
                    value={profile?.emp_name || ''}
                    readOnly
                    className="w-full border rounded-lg p-2 text-sm bg-gray-100"
                  />
                </div>

                <div className="flex flex-col w-36">
                  <label className="text-xs mb-1" htmlFor="start-date">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>

                <div className="flex flex-col w-36">
                  <label className="text-xs mb-1" htmlFor="end-date">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>

                <div className="flex flex-col w-28">
                  <label className="text-xs mb-1" htmlFor="leave-type-code">
                    Leave Type
                  </label>
                  <input
                    id="leave-type-code"
                    type="text"
                    name="leave_type_code"
                    value={form.leave_type_code}
                    onChange={handleChange}
                    className="w-full border rounded-lg p-2 text-sm"
                    placeholder="00001"
                    maxLength={5}
                    pattern="\d{1,5}"
                  />
                </div>

                <div className="flex flex-col w-20">
                  <label className="text-xs mb-1" htmlFor="total-days">
                    Total Days
                  </label>
                  <input
                    id="total-days"
                    type="text"
                    name="total_days"
                    value={form.total_days}
                    readOnly
                    className="border rounded-lg p-2 text-sm bg-gray-100 w-full text-center"
                    maxLength={3}
                  />
                </div>

                <div className="flex flex-col w-48">
                  <label className="text-xs mb-1" htmlFor="reason">
                    Reason
                  </label>
                  <input
                    id="reason"
                    type="text"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>

                <div className="flex items-center">
                  {error && (
                    <div className="text-red-500 mr-3 text-sm">{error}</div>
                  )}
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm h-10 w-20 flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </form>
            )}

            {selectedPanel === 'Leave Report' && (
              <div>
                <div className="mb-3">
                  <label
                    className="text-sm block mb-1"
                    htmlFor="filter-employee"
                  >
                    Filter by Employee
                  </label>
                  <select
                    id="filter-employee"
                    value={filterEmp}
                    onChange={(e) => setFilterEmp(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">All Employees</option>
                    {profiles.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.emp_name} ({emp.emp_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3">Employee</th>
                        <th className="text-left py-2 px-3">Leave Type</th>
                        <th className="text-left py-2 px-3">Allocated</th>
                        <th className="text-left py-2 px-3">Used</th>
                        <th className="text-left py-2 px-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-gray-500"
                          >
                            No allocations / insufficient privileges
                          </td>
                        </tr>
                      ) : (
                        allocations.map((a) => (
                          <tr
                            key={`${a.profile}-${a.leave_type}`}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-2 px-3">{a.profile}</td>
                            <td className="py-2 px-3">{a.leave_type_name}</td>
                            <td className="py-2 px-3">{a.allocated}</td>
                            <td className="py-2 px-3">{a.used}</td>
                            <td className="py-2 px-3">{a.balance}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedPanel === 'Balance Certificate' && (
              <div>
                {myBalances.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {myBalances.map((b) => (
                      <div key={b.leave_type} className="border rounded p-2">
                        <div className="text-sm font-semibold">
                          {b.leave_type_name} ({b.leave_type})
                        </div>
                        <div className="text-xs">Allocated: {b.allocated}</div>
                        <div className="text-xs">Used: {b.used}</div>
                        <div className="text-xs">Balance: {b.balance}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">
                    No leave allocations found for current period
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPanel !== 'Entry Leave' && (
        <div className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-gray-50 p-3">
            <div className="font-semibold">Last Leave Records</div>
            <div className="text-sm text-gray-500">
              {filteredEntries.length} record(s)
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Report No</th>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Dates</th>
                  <th className="px-3 py-2 text-left">Days</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No records
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((le) => (
                    <tr
                      key={le.id}
                      className="cursor-pointer border-b hover:bg-gray-50"
                      onClick={() => {
                        setForm({
                          leave_type: le.leave_type,
                          start_date: le.start_date,
                          end_date: le.end_date,
                          reason: le.reason || '',
                        });
                        setProfile(
                          profiles.find((p) => p.id === le.emp) || profile,
                        );
                        setSelectedPanel('Entry Leave');
                        setPanelOpen(true);
                      }}
                    >
                      <td className="px-3 py-2">{le.leave_report_no}</td>
                      <td className="px-3 py-2">{le.emp_name}</td>
                      <td className="px-3 py-2">{le.leave_type_name}</td>
                      <td className="px-3 py-2">
                        {le.start_date} - {le.end_date}
                      </td>
                      <td className="px-3 py-2">{le.total_days}</td>
                      <td className="px-3 py-2">{le.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-3">
            <div className="text-xs text-gray-500">
              Tip: use the Report panel to filter quickly.
            </div>
            <div className="text-xs text-gray-500">
              Showing latest records first.
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default EmpLeavePage;
