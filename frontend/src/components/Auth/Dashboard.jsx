// src/components/Auth/Dashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import Sidebar from '../Menu/Sidebar.jsx';
import WorkArea from './WorkArea.jsx';
import ChatBox from './ChatBox.jsx';
import { useAuth } from '../../hooks/useAuth';

const INSTITUTION_NAME = 'My Institution'; // replace with real name or from config
const LOGO_URL = '/logo.png'; // optional: place a logo in frontend/public/logo.png

const MODULES = [
  {
    key: 'verification',
    label: '📜 Verification',
    openMenuLabel: '📜 Transcript',
    endpoint: '/api/admin/verifications',
    statuses: ['pending', 'done', 'cancel'],
    fields: (row) =>
      `${row.studentname || '-'} · ${row.verification_no || '—'} · ${
        row.status
      }`,
  },
  {
    key: 'migration',
    label: '🚀 Migration',
    openMenuLabel: '🚀 Migration',
    endpoint: '/api/admin/migrations',
    statuses: ['pending', 'done', 'cancel', 'correction'],
    fields: (row) =>
      `${row.studentname || '-'} · ${row.migration_number || '—'} · ${
        row.status
      }`,
  },
  {
    key: 'provisional',
    label: '📄 Provisional',
    openMenuLabel: '📄 Provisional',
    endpoint: '/api/admin/provisionals',
    statuses: ['pending', 'done', 'cancel', 'correction'],
    fields: (row) =>
      `${row.studentname || '-'} · ${row.provisional_number || '—'} · ${
        row.status
      }`,
  },
  {
    key: 'institutional',
    label: '🏛️ Institutional Verification',
    openMenuLabel: '🏛️ Institutional Verification',
    endpoint: '/api/admin/institutionals',
    statuses: ['pending', 'done', 'cancel', 'correction', 'fake'],
    fields: (row) =>
      `${row.studentname || '-'} · ${
        row.institutional_verification_number || '—'
      } · ${row.status}`,
  },
];

function ModuleCard({ mod, authFetch, onOpen }) {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '5');
      const res = await authFetch(`${mod.endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error('Load failed');
      const data = await res.json();
      const arr = data.items || data.rows || [];
      setItems(Array.isArray(arr) ? arr.slice(0, 5) : []);
    } catch (e) {
      setError('Could not load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{mod.label}</h3>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {mod.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={onOpen}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            Open
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-600 mb-2">Recent ({statusFilter})</div>
      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between border rounded px-2 py-1"
            >
              <span className="truncate mr-2">{mod.fields(row)}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border capitalize">
                {row.status}
              </span>
            </li>
          ))}
          {!items.length && <li className="text-gray-500 text-sm">No items</li>}
        </ul>
      )}
    </div>
  );
}

function ModuleSelector({ selected, setSelected }) {
  const toggle = (key) => {
    setSelected((prev) => {
      const exists = prev.includes(key);
      if (exists) return prev.filter((k) => k !== key);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, key];
    });
  };
  return (
    <div className="flex flex-wrap gap-2">
      {MODULES.map((m) => {
        const isOn = selected.includes(m.key);
        return (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            className={`px-3 py-1 rounded-full border ${
              isOn
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            } text-sm`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

const Dashboard = ({
  selectedMenuItem,
  setSelectedMenuItem,
  isSidebarOpen,
  setSidebarOpen,
}) => {
  const { user, authFetch } = useAuth();
  const [selectedModuleKeys, setSelectedModuleKeys] = useState([
    'verification',
    'migration',
    'provisional',
    'institutional',
  ]);

  const handleSecureNavigation = async (menuItem) => {
    // Centralize admin access prompting in AdminPanelAccess/WorkArea.
    setSelectedMenuItem(menuItem);
  };

  return (
    <div className={`flex h-screen w-screen transition-all duration-300`}>
      {/* Sidebar (left) */}
      <Sidebar
        isOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setSelectedMenuItem={setSelectedMenuItem}
        handleSecureNavigation={handleSecureNavigation}
      />

      {/* Spacer between sidebar and content */}
      <div className="w-[10px] bg-gray-100" />

      {/* Main content area (center, white). Pad-right to avoid overlap with fixed chat rail */}
      <div
        className="flex-grow flex flex-col bg-white"
        style={{ paddingRight: 'var(--chat-rail-width, calc(4rem + 10px))' }}
      >
        {/* Top spacer */}
        <div className="h-[10px] bg-gray-100" />
        {/* Inner content area */}
        <div className="flex-1 p-4 overflow-hidden">
          {!selectedMenuItem || selectedMenuItem === 'Dashboard' ? (
            <div className="h-full overflow-auto">
              {/* Header */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white mb-6">
                <div className="px-6 py-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                      {/* Logo placeholder */}
                      <img
                        src={LOGO_URL}
                        alt="Logo"
                        className="w-12 h-12 object-contain hidden"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.textContent = '🎓';
                        }}
                      />
                      {/* Fallback emoji/initial */}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-wide">
                        {INSTITUTION_NAME}
                      </h1>
                      <p className="text-white/80 text-sm">
                        Welcome back
                        {user?.first_name ? `, ${user.first_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/80">Current User</div>
                    <div className="text-lg font-semibold">
                      {user?.first_name || user?.username || 'Guest'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Module selector */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Quick Status
                  </h2>
                  <div className="text-sm text-gray-500">
                    Select up to 4 modules
                  </div>
                </div>
                <ModuleSelector
                  selected={selectedModuleKeys}
                  setSelected={setSelectedModuleKeys}
                />
              </div>

              {/* Modules grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pb-2">
                {MODULES.filter((m) => selectedModuleKeys.includes(m.key)).map(
                  (mod) => (
                    <ModuleCard
                      key={mod.key}
                      mod={mod}
                      authFetch={authFetch}
                      onOpen={() => setSelectedMenuItem(mod.openMenuLabel)}
                    />
                  ),
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <WorkArea selectedMenuItem={selectedMenuItem} />
            </div>
          )}
        </div>
      </div>

      {/* Chatbox (right side) */}
      <ChatBox />
    </div>
  );
};

export default Dashboard;
