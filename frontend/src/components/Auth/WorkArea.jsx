// src/components/Layout/WorkArea.jsx
import React, { useState, useEffect } from 'react';

import Transcript from '../pages/verification';
import Migration from '../pages/migration';
import Provisional from '../pages/provisional';
import Degree from '../pages/Degree';
import InstitutionalVerification from '../pages/InstVerification';
import DocumentReceive from '../pages/DocumentReceive';
import EmpLeavePage from '../pages/emp-leave.jsx';
import Enrollment from '../pages/Enrollment';
import AdminDashboard from '../Admin/AdminDashboard';
import AdminPanelAccess from '../Admin/AdminPanelAccess';
import ProfileUpdate from './ProfileUpdate';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import SimpleBoundary from '../common/SimpleBoundary';

const WorkArea = ({ selectedMenuItem }) => {
  const { user } = useAuth();
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // On mount, if a recent admin verification exists in sessionStorage, auto-unlock
  useEffect(() => {
    try {
      const v = sessionStorage.getItem('admin_verified');
      const ts = parseInt(
        sessionStorage.getItem('admin_verified_ts') || '0',
        10,
      );
      if (v === 'true' && ts && Date.now() - ts < 30 * 60 * 1000) {
        setAdminUnlocked(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Global topbar removed: each page renders its own actions (Home/Add/Search/etc.)

  const renderPage = () => {
    switch (selectedMenuItem) {
      case '📜 Transcript':
      case '📜 Verification': // current Sidebar label
        return <Transcript />;
      case '📑 Migration': // legacy label
      case '🚀 Migration': // current Sidebar label
        return <Migration />;
      case '📋 Provisional': // legacy label
      case '📄 Provisional': // current Sidebar label
        return <Provisional />;
      case '🏅 Degree':
        return <Degree />;
      case '🏛️ Institutional Verification':
      case '🏛️ Inst-Verification': // current Sidebar label
        return <InstitutionalVerification />;
      case '📥 Document Receive':
        return <DocumentReceive />;
      case 'Leave Management':
      case '🏖️ Leave Management':
        return <EmpLeavePage />;
      case 'Enrollment':
        // Let the Enrollment component enforce its own permissions.
        return (
          <SimpleBoundary>
            <Enrollment />
          </SimpleBoundary>
        );
      case 'Admin Panel': {
        // backend uses `usertype`; some older records may use `role` — accept either
        const isAdmin = Boolean(
          user && (user.usertype === 'admin' || user.role === 'admin'),
        );
        if (!isAdmin) {
          return (
            <h2 style={{ padding: '20px', color: 'red' }}>Access Denied 🚫</h2>
          );
        }
        return adminUnlocked ? (
          <AdminDashboard />
        ) : (
          <AdminPanelAccess onSuccess={() => setAdminUnlocked(true)} />
        );
      }
      case 'Profile Settings':
        return <ProfileUpdate />;
      default:
        return (
          <h1 style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold' }}>
            Select a Menu Item
          </h1>
        );
    }
  };

  return <div className="w-full h-full">{renderPage()}</div>;
};

WorkArea.propTypes = {
  selectedMenuItem: PropTypes.string,
};

export default WorkArea;
