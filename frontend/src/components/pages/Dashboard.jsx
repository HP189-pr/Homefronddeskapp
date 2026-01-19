import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/AuthContext.jsx';

const INSTITUTION_NAME = 'Kadi Sarva Vishwavidyalaya';
const BACKEND_URL =
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';
const LOGO_PATH = '/media/logo/ksv.png';
const LOGO_URL = `${BACKEND_URL}${LOGO_PATH}`;

const MODULES = [
  {
    key: 'verification',
    label: '📜 Verification',
    openMenuLabel: 'Verification',
    endpoint: '/api/verification/',
    statuses: ['pending', 'done', 'cancel'],
    fields: (row) =>
      `${row.student_name || '-'} - ${row.verification_no || '—'} - ${
        row.status || row.verification_status || ''
      }`,
  },
  {
    key: 'migration',
    label: '🚀 Migration',
    openMenuLabel: 'Migration',
    endpoint: '/api/migration/',
    statuses: ['pending', 'done', 'cancel', 'correction'],
    fields: (row) =>
      `${row.student_name || '-'} - ${row.migration_no || '—'} - ${
        row.status || ''
      }`,
  },
  {
    key: 'provisional',
    label: '📄 Provisional',
    openMenuLabel: 'Provisional',
    endpoint: '/api/provisional/',
    statuses: ['pending', 'done', 'cancel', 'correction'],
    fields: (row) =>
      `${row.student_name || '-'} - ${row.provisional_no || '—'} - ${
        row.status || ''
      }`,
  },
  {
    key: 'institutional',
    label: '🏛️ Institutional Verification',
    openMenuLabel: 'Inst-Verification',
    endpoint: '/api/inst-verification-main/',
    statuses: ['pending', 'done', 'cancel', 'correction', 'fake'],
    fields: (row) =>
      `${row.student_name || '-'} - ${row.enrollment_no || '—'} - ${
        row.verification_status || row.status || ''
      }`,
  },
  {
    key: 'mailrequests',
    label: '📧 Mail Requests',
    openMenuLabel: 'Official Mail Status',
    endpoint: '/api/mail-requests/',
    statuses: ['pending', 'progress', 'done'],
    fields: (row) =>
      `${row.mail_req_no || row.id || '-'} • ${row.mail_status || ''} • ${
        row.enrollment_no || '—'
      } • ${row.student_name || '-'}`,
  },
  {
    key: 'transcript_pdf',
    label: '📄 Transcript Requests',
    openMenuLabel: 'Transcript Requests',
    endpoint: '/api/transcript-requests/',
    statuses: ['pending', 'progress', 'done'],
    fields: (row) =>
      `${row.tr_request_no || row.request_ref_no || '-'} • ${
        row.enrollment_no || '—'
      } • ${row.student_name || '-'} • ${row.pdf_generate || ''} • ${
        row.mail_status || ''
      }`,
  },
  {
    key: 'student_search',
    label: '🔍 Student Search',
    openMenuLabel: 'Student Search',
    endpoint: null,
    statuses: [],
    fields: null,
    isSearch: true,
  },
];

function ModuleCard({ mod, authFetch, onOpen }) {
  const [statusFilter, setStatusFilter] = useState(mod.statuses[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mod.isSearch) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        params.set('limit', '5');
        const url = `${mod.endpoint}?${params.toString()}`;
        const res = await authFetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Load failed (${res.status}) ${text}`);
        }
        const data = await res.json();
        const arr = data.items || data.rows || data || [];
        setItems(Array.isArray(arr) ? arr.slice(0, 5) : []);
      } catch (err) {
        setError(
          typeof err === 'string' ? err : err.message || 'Could not load',
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authFetch, mod, statusFilter]);

  if (mod.isSearch) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-sm border border-indigo-200 p-6 flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-indigo-900 mb-2">
          Student Search
        </h3>
        <p className="text-gray-600 text-center mb-4 text-sm">
          Search comprehensive student information by enrollment number
        </p>
        <button
          onClick={onOpen}
          className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg transition-all"
        >
          Open Search
        </button>
      </div>
    );
  }

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
              key={row.id || row.pk || JSON.stringify(row)}
              className="flex items-center justify-between border rounded px-2 py-1"
            >
              <span className="truncate mr-2">{mod.fields(row)}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border capitalize">
                {(
                  row.status ||
                  row.verification_status ||
                  row.mail_status ||
                  ''
                ).toString()}
              </span>
            </li>
          ))}
          {!items.length && <li className="text-gray-500 text-sm">No items</li>}
        </ul>
      )}
    </div>
  );
}

ModuleCard.propTypes = {
  mod: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    openMenuLabel: PropTypes.string,
    endpoint: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    statuses: PropTypes.arrayOf(PropTypes.string).isRequired,
    fields: PropTypes.oneOfType([PropTypes.func, PropTypes.oneOf([null])]),
    isSearch: PropTypes.bool,
  }).isRequired,
  authFetch: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

function ModuleSelector({ selected, setSelected }) {
  const toggle = (key) => {
    setSelected((prev) => {
      const exists = prev.includes(key);
      if (exists) return prev.filter((k) => k !== key);
      if (prev.length >= 4) return prev;
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

ModuleSelector.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelected: PropTypes.func.isRequired,
};

export default function CustomDashboardClean({ setSelectedMenuItem }) {
  const { user } = useAuth();

  const STORAGE_KEY = 'selected_dashboard_modules';
  const DEFAULT_SELECTED = [
    'verification',
    'migration',
    'provisional',
    'institutional',
    'mailrequests',
    'transcript_pdf',
  ];

  const [selectedModuleKeys, setSelectedModuleKeys] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const merged = Array.from(new Set([...parsed, ...DEFAULT_SELECTED]));
          return merged.slice(0, 4);
        }
      }
    } catch {
      // ignore and fall back to defaults
    }
    return DEFAULT_SELECTED.slice(0, 4);
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedModuleKeys));
    } catch {
      // ignore storage errors
    }
  }, [selectedModuleKeys]);

  const authFetch = async (url, opts = {}) => {
    const token = localStorage.getItem('access_token');
    const headers = Object.assign({}, opts.headers || {}, {
      Authorization: token ? `Bearer ${token}` : '',
    });
    return fetch(url, Object.assign({}, opts, { headers }));
  };

  const handleOpenModule = (openMenuLabel) => {
    if (setSelectedMenuItem && openMenuLabel) {
      setSelectedMenuItem(openMenuLabel);
    }
  };

  const selectedCount = selectedModuleKeys.length;
  let gridClass = 'grid grid-cols-1';
  if (selectedCount === 1) gridClass = 'grid grid-cols-1';
  else if (selectedCount === 2) gridClass = 'grid grid-cols-1 sm:grid-cols-2';
  else if (selectedCount === 3) gridClass = 'grid grid-cols-1 md:grid-cols-3';
  else if (selectedCount >= 4) gridClass = 'grid grid-cols-1 sm:grid-cols-2';

  return (
    <div
      className="flex flex-col bg-white"
      style={{ paddingRight: 'var(--chat-rail-width, calc(4rem + 10px))' }}
    >
      <div className="h-[10px] bg-white" />
      <div className="p-4 overflow-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white mb-6">
          <div className="px-6 py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                <img
                  src={LOGO_URL}
                  alt="logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wide">
                  {INSTITUTION_NAME}
                </h1>
                <p className="text-white/80 text-sm">
                  Welcome back{user?.first_name ? `, ${user.first_name}` : ''}
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

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Quick Status
            </h2>
            <span className="text-sm text-gray-500">Select up to 4 cards</span>
          </div>
          <ModuleSelector
            selected={selectedModuleKeys}
            setSelected={setSelectedModuleKeys}
          />
        </div>

        <div className={`${gridClass} gap-4 pb-2`}>
          {MODULES.filter((m) => selectedModuleKeys.includes(m.key)).map(
            (mod) => (
              <ModuleCard
                key={mod.key}
                mod={mod}
                authFetch={authFetch}
                onOpen={() => handleOpenModule(mod.openMenuLabel)}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

CustomDashboardClean.propTypes = {
  setSelectedMenuItem: PropTypes.func,
};
