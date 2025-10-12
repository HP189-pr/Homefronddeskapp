// src/components/Auth/HomeDashboard.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * HomeDashboard
 *
 * Props:
 *  - setSelectedMenuItem(menuItem) : parent handler to set the workarea menu
 *  - navigate(page, meta) : optional in-app navigator from AppRouter (preferred)
 */
const HomeDashboard = ({ setSelectedMenuItem, navigate }) => {
  const openModule = (menuItem) => {
    // update parent selection so WorkArea can render immediately
    if (typeof setSelectedMenuItem === 'function')
      setSelectedMenuItem(menuItem);

    // prefer in-app navigate if provided (matches AppRouter style)
    if (typeof navigate === 'function') {
      navigate('dashboard', { from: 'home', module: menuItem });
      return;
    }

    // Fallback: if no in-app navigator, try a simple location change (still works)
    // Note: fallback keeps compatibility if somewhere else uses react-router
    try {
      window.history.pushState(
        { page: 'dashboard', meta: { from: 'home', module: menuItem } },
        '',
        window.location.pathname,
      );
      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: {
            page: 'dashboard',
            meta: { from: 'home', module: menuItem },
          },
        }),
      );
    } catch (e) {
      // last resort: full navigation (shouldn't be necessary in SPA)
      window.location.href = '/';
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Welcome to Your Dashboard</h1>

      <p className="mt-2 text-sm text-gray-600">
        Choose a module to open it in the Work Area.
      </p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => openModule('Transcript')}
          className="p-4 bg-blue-500 text-white rounded shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Open Transcript module"
        >
          <span className="inline-block text-2xl mr-2">📚</span>
          <span className="font-medium">Transcript</span>
        </button>

        <button
          onClick={() => openModule('Migration')}
          className="p-4 bg-green-500 text-white rounded shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-green-300"
          aria-label="Open Migration module"
        >
          <span className="inline-block text-2xl mr-2">🚀</span>
          <span className="font-medium">Migration</span>
        </button>

        <button
          onClick={() => openModule('Attendance')}
          className="p-4 bg-yellow-500 text-white rounded shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          aria-label="Open Attendance module"
        >
          <span className="inline-block text-2xl mr-2">📅</span>
          <span className="font-medium">Attendance</span>
        </button>
      </div>
    </div>
  );
};

HomeDashboard.propTypes = {
  setSelectedMenuItem: PropTypes.func.isRequired,
  navigate: PropTypes.func,
};

export default HomeDashboard;
