//src/components/Admin/AdminDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import InstitutesAdmin from './InstitutesAdmin';
import UsersAdmin from './UsersAdmin';
import PermissionsAdmin from './PermissionsAdmin';
import CourseAdmin from './CourseAdmin';
import SystemSettings from './path.jsx';
import Upload from './Upload.jsx';
import DataAnalysis from './DataAnalysis.jsx';

/**
 * AdminDashboard
 *
 * Props:
 * Self-contained Admin Dashboard with its own section navigation.
 */
const AdminDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState('Institute Management');

  // Access control: only admin usertype should see this panel
  const isAdmin = user && (user.usertype === 'admin' || user.role === 'admin');
  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-xl font-semibold mb-3">Access Denied</h3>
          <p className="text-gray-600 mb-4">
            You don’t have permission to view the Admin Dashboard.
          </p>
          <div className="text-sm text-gray-500">
            Required role: <span className="font-medium">admin</span>
          </div>
        </div>
      </div>
    );
  }

  const content = (() => {
    switch (section) {
      case 'User Management':
        return <UsersAdmin />;
      case 'Institute Management':
      case 'Add College': // legacy synonym
        return <InstitutesAdmin />;
      case 'Course Management':
      case 'Add Course': // legacy synonym
        return <CourseAdmin />;
      case 'User Rights':
        return <PermissionsAdmin />;
      case 'System Settings':
        return <SystemSettings />;
      case 'Upload':
        return <Upload />;
      case 'Data Analysis':
        return <DataAnalysis />;
      default:
        return <div className="text-gray-700">Select an admin section.</div>;
    }
  })();

  return (
    <main className="flex-1 p-3 bg-white min-h-0 overflow-auto">
      <div className="bg-white shadow rounded p-6 min-h-[220px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Admin Dashboard</h2>
        </div>
        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            'Institute Management',
            'Course Management',
            'User Management',
            'User Rights',
            'System Settings',
            'Upload',
            'Data Analysis',
          ].map((name) => (
            <button
              key={name}
              onClick={() => setSection(name)}
              className={`px-3 py-1.5 rounded-full border text-sm ${
                section === name
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        {content}
      </div>
    </main>
  );
};

export default AdminDashboard;
