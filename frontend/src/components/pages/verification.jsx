import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaSearch,
  FaFileCsv,
  FaFileExcel,
  FaEdit,
  FaEye,
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import PageLayout from './PageLayout';

export default function Verification() {
  const { authFetch } = useAuth();
  const [panelOpen, setPanelOpen] = useState(true);
  const [activePanel, setActivePanel] = useState('addEdit');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [autoFilter, setAutoFilter] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    // Prefer server-side filter by temp number if provided in q
    const qs = params.toString();
    const url = '/api/admin/verifications' + (qs ? `?${qs}` : '');
    const res = await authFetch(url);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }, [authFetch, q, status]);

  useEffect(() => {
    // Adjust filter when navigated from Document Receive
    try {
      const raw = sessionStorage.getItem('service_focus');
      if (raw) {
        const f = JSON.parse(raw);
        if (f?.type === 'verification') {
          if (f.vryearautonumber) setQ(f.vryearautonumber);
          else if (f.enrollment_no) setQ(f.enrollment_no);
          setAutoFilter(true);
          sessionStorage.removeItem('service_focus');
        }
      }
    } catch (err) {
      void err; // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canSearch = useMemo(() => true, []);

  const panelTitle =
    activePanel === 'addEdit'
      ? 'Entry Panel'
      : activePanel === 'search'
      ? 'Search Panel'
      : activePanel === 'report'
      ? 'Report Panel'
      : 'Excel Upload';

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setActivePanel('addEdit');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white shadow-sm hover:bg-emerald-500"
      >
        <FaPlus className="text-sm" /> Transcript Add
      </button>
      <button
        type="button"
        onClick={() => {
          setActivePanel('search');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-500"
      >
        <FaSearch className="text-sm" /> Mix Search
      </button>
      <button
        type="button"
        onClick={() => {
          setActivePanel('report');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-cyan-600 text-white shadow-sm hover:bg-cyan-500"
      >
        <FaFileCsv className="text-sm" /> Report
      </button>
      <button
        type="button"
        onClick={() => {
          setActivePanel('excel');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-lime-600 text-white shadow-sm hover:bg-lime-500"
      >
        <FaFileExcel className="text-sm" /> Import Excel
      </button>
    </div>
  );

  return (
    <PageLayout
      icon={
        <span aria-hidden className="text-2xl">
          📜
        </span>
      }
      title="Verification"
      actions={actions}
      card={false}
      contentClassName="space-y-4"
    >
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <div className="text-base font-semibold capitalize text-gray-700">
            {panelTitle}
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
            {/* Panel content based on activePanel */}
            {activePanel === 'addEdit' && (
              <div className="text-sm text-gray-600">
                Transcript entry form goes here.
              </div>
            )}
            {activePanel === 'search' && (
              <div className="text-sm text-gray-600">
                Search form goes here.
              </div>
            )}
            {activePanel === 'report' && (
              <div className="text-sm text-gray-600">
                Report options go here.
              </div>
            )}
            {activePanel === 'excel' && (
              <div className="text-sm text-gray-600">
                Excel import UI goes here.
              </div>
            )}
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm mt-4">
        <div className="overflow-auto">
          {(q || status) && (
            <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-600 border-b bg-yellow-50">
              <div className="flex items-center gap-2">
                <span className="font-medium">Active filter:</span>
                {q && (
                  <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5">
                    q:
                    <span className="font-mono">{q}</span>
                  </span>
                )}
                {status && (
                  <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5">
                    status:
                    <span className="font-mono">{status}</span>
                  </span>
                )}
                {autoFilter && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                    from Document Receive
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setStatus('');
                  setAutoFilter(false);
                  // defer load to next effect cycle
                  setTimeout(() => load(), 0);
                }}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                Clear filters
              </button>
            </div>
          )}
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-mono">Date</th>
                <th className="px-3 py-2 text-left font-mono">FileNo</th>
                <th className="px-3 py-2 text-left">Enrollment</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Remark</th>
                <th className="px-3 py-2 text-left">Scan</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {row.doc_rec_date || '-'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {row.verification_no || row.vryearautonumber || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-700">
                    {row.enrollment_no || '-'}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-700">
                    {row.studentname || '-'}
                  </td>
                  <td className="px-3 py-2 text-sm capitalize text-gray-700">
                    {row.status}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {row.remark || ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {row.doc_scan_copy ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <FaEye /> View
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <FaEdit /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-gray-500"
                    colSpan={8}
                  >
                    No records yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <input
              placeholder="Search..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border p-1 px-2 rounded"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border p-1 px-2 rounded"
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="in-progress">in-progress</option>
              <option value="done">done</option>
              <option value="cancel">cancel</option>
            </select>
            <button
              type="button"
              disabled={!canSearch}
              onClick={load}
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FaSearch /> Apply
            </button>
          </div>
          <div>Total records: {items.length}</div>
        </div>
      </div>
    </PageLayout>
  );
}
