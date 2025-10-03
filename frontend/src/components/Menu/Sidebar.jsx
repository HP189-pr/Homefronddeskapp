import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNav } from '../../navigation/NavigationContext';
import { useAuth } from '../../hooks/useAuth';

const BACKEND_MEDIA_URL = 'http://localhost:5000/media/Profpic/';

const staticModules = [
  {
    id: 'student',
    name: 'Student Module',
    icon: '🎓',
    menu: [
      'Enrollment',   
      '📜 Verification',
      '🚀 Migration',
      '📄 Provisional',
      '🏅 Degree',
      '🏛️ Inst-Verification',
    ],
  },
  {
    id: 'office_management',
    name: 'Office Management',
    icon: '🏢',
    menu: ['📥 Document Receive', '📥 Inward', '📤 Outward', '🏖️ Leave Management', '📦 Inventory'],
  },
  {
    id: 'finance',
    name: 'Accounts & Finance',
    icon: '💰',
    menu: ['📊 Daily Register', '💵 Student Fees', '🔍 Payment Track'],
  },
];

const Sidebar = ({ isOpen, setSidebarOpen, setSelectedMenuItem }) => {
  const { navigate } = useNav();
  const [selectedModule, setSelectedModule] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout, verifyPassword, authFetch } = useAuth();
  const [allowedModules, setAllowedModules] = useState([]); // from backend
  const [allowedMenusByModule, setAllowedMenusByModule] = useState({});
  const [canAccessAdminPanel, setCanAccessAdminPanel] = useState(false);
  const [profilePic, setProfilePic] = useState(
    '/profilepic/default-profile.jpg',
  );

  useEffect(() => {
    if (user?.usrpic) {
      setProfilePic(`${BACKEND_MEDIA_URL}${user.usrpic}`);
    } else {
      setProfilePic('/profilepic/default-profile.jpg');
    }
  }, [user]);

  // Fetch rights and build allowed menu tree
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await authFetch('/api/admin/rights/my');
        if (!res.ok) {
          // Fallback for non-admin users: minimal rights info
          const res2 = await authFetch('/api/rights/my');
          if (res2.ok) {
            const d2 = await res2.json();
            if (!cancelled) setCanAccessAdminPanel(!!(d2.admin || (d2.permissions && d2.permissions.length)));
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const moduleMap = new Map((data.modules || []).map(m => [m.moduleid, m]));
        const menus = data.menus || [];
        const byModule = {};
        for (const m of menus) {
          const key = String(m.moduleid);
          if (!byModule[key]) byModule[key] = [];
          byModule[key].push(m);
        }
        const mods = Array.from(moduleMap.values());
        setAllowedModules(mods);
        setAllowedMenusByModule(byModule);
        setCanAccessAdminPanel(!!(mods.length || (data.permissions && data.permissions.length)));
      } catch (e) {
        // ignore
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user]);

  const handleModuleSelect = (moduleId) => {
    setSelectedModule(moduleId);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    logout(navigate);
    setProfilePic('/profilepic/default-profile.jpg');
  };

  const handleSecurePageAccess = async (menuItem) => {
    // Don't prompt here; navigate to the secure page and let the page-level
    // AdminPanelAccess handle prompting. If session cache shows verified,
    // WorkArea will auto-unlock.
    setSelectedMenuItem(menuItem);
  };

  const handleMenuClick = (menuItem) => {
    if (menuItem === 'Admin Panel' || menuItem === 'Profile Settings') {
      handleSecurePageAccess(menuItem);
    } else {
      setSelectedMenuItem(menuItem);
    }
  };

  return (
    <div
      className={`h-screen bg-gray-800 text-white transition-all ${
        isOpen ? 'w-64' : 'w-20'
      } duration-300 p-4 relative flex flex-col`}
    >
      {/* Profile Section */}
      <div className="flex items-center pt-4">
        <img
          src={profilePic}
          alt="Profile"
          className="w-14 h-14 rounded-full object-cover border-2 border-white"
        />

        {isOpen && (
          <div className="ml-4 flex items-center">
            <span className="text-lg font-semibold">
              {user?.first_name || 'Guest'}
            </span>
            <button
              onClick={() => handleMenuClick('Profile Settings')}
              className="text-white hover:text-gray-300 ml-2"
            >
              📝
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!isOpen)}
        className="absolute top-0.5 right-4 w-[30px] h-[30px] rounded-full bg-gray-800 text-white hover:bg-gray-600 transition text-3xl flex items-center justify-center leading-none"
      >
        {isOpen ? '«' : '»'}
      </button>

      <hr className="border-gray-600 my-2" />

      {/* Dashboard Button */}
      <button
        onClick={() => handleMenuClick('Dashboard')}
        className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
      >
        {isOpen ? '🏠 Dashboard' : '🏠'}
      </button>

      <hr className="border-gray-600 my-2" />

      {/* Module Selection */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full text-left px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          {isOpen
            ? (selectedModule
                ? (() => {
                    // Prefer dynamic module name if available
                    const dyn = allowedModules.find((m) => String(m.moduleid) === String(selectedModule));
                    if (dyn) return dyn.name;
                    const stat = staticModules.find((m) => m.id === selectedModule);
                    return stat ? stat.name : '🗃️ Select Module';
                  })()
                : '🗃️ Select Module')
            : '🗃️'}
        </button>
        {showDropdown && (
          <div className="absolute left-0 w-full bg-gray-700 rounded shadow-lg z-10">
            {(allowedModules.length ? allowedModules : staticModules).map((mod) => (
              <button
                key={mod.id || mod.moduleid}
                onClick={() => handleModuleSelect(mod.id || String(mod.moduleid))}
                className="w-full text-left px-4 py-2 hover:bg-gray-600 flex items-center"
              >
                <span className="mr-2">{mod.icon || '📦'}</span> {mod.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <hr className="border-gray-600 my-2" />

      {/* Module Menus */}
      {selectedModule && (
        <div className={`${isOpen ? 'block' : 'hidden'}`}>
          {(() => {
            const staticMenus = staticModules.find((m) => m.id === selectedModule)?.menu || [];
            const dynamicMenus = allowedMenusByModule[selectedModule] ? allowedMenusByModule[selectedModule].map(m => m.name) : [];
            const items = dynamicMenus.length ? dynamicMenus : staticMenus;
            return items.map((item) => (
              <button
                key={item}
                onClick={() => handleMenuClick(item)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700"
              >
                {isOpen ? item : '•'}
              </button>
            ));
          })()}
        </div>
      )}

      <hr className="border-gray-600 my-4" />

      {/* Admin Panel Button */}
      {allowedModules.length > 0 && (
        <button
          onClick={() => handleMenuClick('Admin Panel')}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          {isOpen ? '🛠️ Admin Panel' : '🛠️'}
        </button>
      )}

      {/* Logout Button */}
      <div className="mt-auto">
        <hr className="border-gray-600 my-4" />
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          {isOpen ? '🚪 Logout' : '🚪'}
        </button>
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  setSelectedMenuItem: PropTypes.func.isRequired,
};
export default Sidebar;
