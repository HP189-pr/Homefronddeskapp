// src/components/Layout/WorkArea.jsx
import React, { useState, useEffect } from 'react';

import Transcript from '../pages/verification';
import Migration from '../pages/migration';
import Provisional from '../pages/provisional';
import Degree from '../pages/Degree';
import InstitutionalVerification from '../pages/InstVerification';
import DocumentReceive from '../pages/DocumentReceive';
import Inward from '../pages/Inward';
import Outward from '../pages/Outward';
import Inventory from '../pages/Inventory';
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
    } catch {
      // ignore
    }
  }, []);

  // Global topbar removed: each page renders its own actions (Home/Add/Search/etc.)

  const renderPage = () => {
    const rawLabel = selectedMenuItem || '';
    const normalized = rawLabel
      .replace(/^[^A-Za-z0-9]+/, '')
      .trim()
      .toLowerCase();

    if (!normalized || normalized === 'dashboard') {
      return (
        <h1 style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold' }}>
          Select a Menu Item
        </h1>
      );
    }

    if (normalized === 'admin panel') {
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

    if (normalized === 'profile settings') {
      return <ProfileUpdate />;
    }

    switch (normalized) {
      case 'transcript':
      case 'verification':
        return <Transcript />;
      case 'migration':
        return <Migration />;
      case 'provisional':
        return <Provisional />;
      case 'degree':
        return <Degree />;
      case 'institutional verification':
      case 'inst verification':
      case 'inst-verification':
        return <InstitutionalVerification />;
      case 'document receive':
        return <DocumentReceive />;
      case 'inward':
        return <Inward />;
      case 'outward':
        return <Outward />;
      case 'inventory':
        return <Inventory />;
      case 'leave management':
        return <EmpLeavePage />;
      case 'enrollment':
        return (
          <SimpleBoundary>
            <Enrollment />
          </SimpleBoundary>
        );
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
