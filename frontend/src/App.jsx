import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/AuthContext.jsx';
import Login from './components/pages/Login';
import Sidebar from './components/Menu/Sidebar';
import WorkArea from './components/pages/WorkArea';
import ChatBox from './components/common/ChatBox.jsx';
const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  return user || token ? children : <Navigate to="/login" />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// ✅ Layout component with Sidebar & WorkArea
const Layout = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isChatboxOpen, setChatboxOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden flex items-stretch gap-[1px]">
      {/* Left rail */}
      <Sidebar
        isOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setSelectedMenuItem={setSelectedMenuItem}
      />

      {/* Work area (no side padding; gap is handled by parent flex gap + spacer) */}
      <div className="flex-1 h-screen relative transition-all duration-300 overflow-hidden">
        <WorkArea
          selectedSubmenu={selectedMenuItem}
          selectedMenuItem={selectedMenuItem}
          setSelectedMenuItem={setSelectedMenuItem}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleChatbox={() => setChatboxOpen((v) => !v)}
          isSidebarOpen={isSidebarOpen}
          isChatboxOpen={isChatboxOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Right spacer to maintain a constant gap to the chat (collapsed/expanded) */}
      <div
        aria-hidden
        className="shrink-0 transition-all duration-300"
        style={{ width: isChatboxOpen ? 261 : 61 }}
      />

      {/* Chat rail fixed to the right edge */}
      <ChatBox
        isOpen={isChatboxOpen}
        onToggle={(v) =>
          setChatboxOpen(typeof v === 'boolean' ? v : !isChatboxOpen)
        }
      />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout /> {/* ✅ Replacing Dashboard with Layout */}
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
