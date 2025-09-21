import React, { useState, useEffect } from 'react';
import Transcript from '../pages/Transcript';
import Migration from '../pages/Migration';
import Provisional from '../pages/Provisional';
import Degree from '../pages/Degree';
import InstitutionalVerification from '../pages/InstitutionalVerification';
import AdminDashboard from './AdminDashboard';
import ProfileUpdate from './ProfileUpdate';

import menuActions from '../Menu/menuActions';
import PropTypes from 'prop-types';

const WorkArea = ({ selectedSubmenu }) => {
  const [topbarOptions, setTopbarOptions] = useState([]);
  const [selectedTopbarMenu, setSelectedTopbarMenu] = useState(null); // Store selected menu

  // Update topbar options when submenu changes
  useEffect(() => {
    if (selectedSubmenu && menuActions[selectedSubmenu]) {
      setTopbarOptions(menuActions[selectedSubmenu]());
      setSelectedTopbarMenu(null); // Reset when submenu changes
    } else {
      setTopbarOptions([]);
    }
  }, [selectedSubmenu]);

  // Function to render the selected page
  const renderPage = () => {
    switch (selectedSubmenu) {
      case '📜 Transcript':
        return <Transcript />;
      case '📑 Migration':
        return <Migration />;
      case '📋 Provisional':
        return <Provisional />;
      case '🏅 Degree':
        return <Degree />;
      case '🏛️ Institutional Verification':
        return <InstitutionalVerification />;
      case 'Admin Panel':
        return <AdminDashboard selectedTopbarMenu={selectedTopbarMenu} />; // ✅ Fixed prop name
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

  return (
    <div>
      {/* Topbar Menu */}
      {topbarOptions.length > 0 && (
        <div
          style={{
            background: '#f5f5f5',
            padding: '10px',
            display: 'flex',
            gap: '10px',
          }}
        >
          {topbarOptions.map((option, index) => (
            <button
              key={index}
              style={{
                padding: '8px 12px',
                background:
                  selectedTopbarMenu === option ? '#0056b3' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedTopbarMenu(option)} // Set selected menu
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Main Work Area */}
      <div style={{ padding: '20px' }}>{renderPage()}</div>
    </div>
  );
};
WorkArea.propTypes = {
  selectedSubmenu: PropTypes.string.isRequired,
};

export default WorkArea;
