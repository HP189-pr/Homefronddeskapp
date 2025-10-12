import React, { useState } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaSearch,
  FaFileCsv,
  FaFileExcel,
  FaEdit,
} from 'react-icons/fa';
import PageLayout from './PageLayout';

const demoRecords = [
  {
    id: 1,
    date: '12-10-2025',
    refNo: 'OUT-0001',
    to: 'Registrar Office',
    subject: 'Dispatch Docs',
    status: 'sent',
    remark: 'Courier',
  },
  {
    id: 2,
    date: '11-10-2025',
    refNo: 'OUT-0002',
    to: 'ABC Ltd',
    subject: 'Response',
    status: 'pending',
    remark: '—',
  },
];

export default function Outward() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [activePanel, setActivePanel] = useState('addEdit');
  const [records] = useState(demoRecords);

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
        <FaPlus className="text-sm" />
        Add Outward
      </button>
      <button
        type="button"
        onClick={() => {
          setActivePanel('search');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-500"
      >
        <FaSearch className="text-sm" />
        Search
      </button>
      <button
        type="button"
        onClick={() => {
          setActivePanel('report');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-cyan-600 text-white shadow-sm hover:bg-cyan-500"
      >
        <FaFileCsv className="text-sm" />
        Report
      </button>
      <button
        type="button"
        onClick={() => {
          setActivePanel('excel');
          setPanelOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-lime-600 text-white shadow-sm hover:bg-lime-500"
      >
        <FaFileExcel className="text-sm" />
        Import Excel
      </button>
    </div>
  );

  return (
    <PageLayout
      icon={
        <span aria-hidden className="text-2xl">
          📤
        </span>
      }
      title="Outward"
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
          <div className="p-4 text-sm text-gray-600">
            {activePanel === 'addEdit' && (
              <div>Outward entry form goes here.</div>
            )}
            {activePanel === 'search' && <div>Search filters go here.</div>}
            {activePanel === 'report' && <div>Report options go here.</div>}
            {activePanel === 'excel' && <div>Excel import UI goes here.</div>}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-mono">Date</th>
                <th className="px-3 py-2 text-left font-mono">Ref No</th>
                <th className="px-3 py-2 text-left">To</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Remark</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {row.date}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {row.refNo}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">{row.to}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2 text-sm capitalize text-gray-700">
                    {row.status}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {row.remark}
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
              {records.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-gray-500"
                    colSpan={7}
                  >
                    No records yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <div>Total records: {records.length}</div>
        </div>
      </div>
    </PageLayout>
  );
}
