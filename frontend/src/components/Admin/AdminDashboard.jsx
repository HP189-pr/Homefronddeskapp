import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';

/**
 * AdminDashboard
 *
 * Props:
 * - selectedTopbarItem (string) : the currently selected topbar item (drives sidebar content)
 * - selectedSidebarItem (string) : optional controlled selected sidebar item
 * - onSelect (fn) : callback when user selects an inner sidebar item -> onSelect(item)
 */
const sidebarMenus = {
  'User Management': ['User List', 'Add User', 'User Rights', 'User Logs'],
  'User Rights': ['Role Permissions', 'Department Rights'],
  'Add College': ['Add New College', 'Manage Colleges'],
  'Add Course': ['Add New Course', 'Manage Courses'],
};

const ChevronIcon = ({ className = '' }) => (
  <svg
    className={`w-4 h-4 inline-block ${className}`}
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AdminDashboard = ({
  selectedTopbarItem,
  selectedSidebarItem: controlledSelected,
  onSelect = () => {},
}) => {
  const { user } = useAuth();
  const [currentSidebarItem, setCurrentSidebarItem] = useState(controlledSelected || '');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  useEffect(() => {
    // Reset inner sidebar selection when topbar item changes
    setCurrentSidebarItem('');
    // close mobile sidebar when topbar change happens
    setSidebarOpenMobile(false);
  }, [selectedTopbarItem]);

  useEffect(() => {
    // if the parent controls selection, reflect it
    if (controlledSelected !== undefined && controlledSelected !== null) {
      setCurrentSidebarItem(controlledSelected);
    }
  }, [controlledSelected]);

  const sidebarItems = sidebarMenus[selectedTopbarItem] || [];

  const handleSelect = (item) => {
    setCurrentSidebarItem(item);
    onSelect(item);
    // on mobile close after selection
    setSidebarOpenMobile(false);
  };

  // Access control: only admin usertype should see this panel (aligns to your models: usertype enum)
  if (!user || user.usertype !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-xl font-semibold mb-3">Access Denied</h3>
          <p className="text-gray-600 mb-4">
            You don’t have permission to view the Admin Dashboard. If you believe this is an error,
            please contact an administrator.
          </p>
          <div className="text-sm text-gray-500">Required role: <span className="font-medium">admin</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Mobile toggle */}
      <div className="md:hidden absolute top-4 left-4 z-30">
        <button
          aria-expanded={sidebarOpenMobile}
          aria-controls="admin-inner-sidebar"
          onClick={() => setSidebarOpenMobile((s) => !s)}
          className="bg-white/90 px-3 py-2 rounded shadow text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {sidebarOpenMobile ? 'Close Admin Menu' : 'Open Admin Menu'} <ChevronIcon className={`${sidebarOpenMobile ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Inner Sidebar (Admin Dashboard level) */}
      <aside
        id="admin-inner-sidebar"
        className={`bg-gray-50 text-black flex flex-col p-4 border-r border-gray-200 transition-all
          ${sidebarOpenMobile ? 'w-56' : 'w-0 md:w-60'} overflow-hidden`}
        aria-hidden={!sidebarOpenMobile && window.innerWidth < 768}
      >
        <div className="hidden md:flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Admin</h4>
        </div>

        <nav className="flex-1 space-y-2">
          {sidebarItems.length === 0 ? (
            <div className="px-2 py-4 text-sm text-gray-500">No options available for this section.</div>
          ) : (
            sidebarItems.map((item) => {
              const active = currentSidebarItem === item;
              return (
                <button
                  key={item}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left py-2 px-3 rounded-md transition flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${active ? 'bg-indigo-600 text-white shadow' : 'hover:bg-gray-100 text-gray-800'}`}
                  aria-current={active ? 'true' : 'false'}
                >
                  {/* small icon */}
                  <span
                    className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-sm font-semibold ${
                      active ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
                    }`}
                    aria-hidden="true"
                  >
                    {item.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                  </span>
                  <span className="flex-1">{item}</span>
                  <ChevronIcon className={`${active ? 'rotate-180 text-white' : 'text-gray-400'}`} />
                </button>
              );
            })
          )}
        </nav>

        {/* optional footer */}
        <div className="mt-4 text-xs text-gray-500">
          Signed in as <span className="font-medium ml-1">{user?.username || user?.first_name || '—'}</span>
        </div>
      </aside>

      {/* Main Content Area (changes based on sidebar item selection) */}
      <main className="flex-1 p-6 bg-gray-100 min-h-0 overflow-auto">
        <div className="bg-white shadow rounded p-6 min-h-[220px]">
          <h2 className="text-xl font-semibold mb-4">
            {selectedTopbarItem || 'Admin'} — <span className="text-indigo-600">{currentSidebarItem || 'Select an option'}</span>
          </h2>

          {/* Content placeholder */}
          {currentSidebarItem ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                ✅ Content for <strong>{currentSidebarItem}</strong> will appear here.
              </p>

              {/* small action row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(currentSidebarItem)}
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  Open {currentSidebarItem}
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Demo action for ${currentSidebarItem}`)}
                  className="px-3 py-1.5 rounded border border-gray-200 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  Demo Action
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              <p>Select an option from the left to begin managing the selected area.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

AdminDashboard.propTypes = {
  selectedTopbarItem: PropTypes.string.isRequired,
  selectedSidebarItem: PropTypes.string,
  onSelect: PropTypes.func,
};

export default AdminDashboard;
