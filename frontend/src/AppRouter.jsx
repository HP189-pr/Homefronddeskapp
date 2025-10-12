// src/AppRouter.jsx
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { onPopState, replacePage } from './navigation/historyRouter';
import { NavigationProvider } from './navigation/NavigationContext';
import { AuthProvider, useAuth } from './hooks/useAuth';

import Login from './components/Auth/Login';
import Sidebar from './components/Menu/Sidebar';
import WorkArea from './components/Auth/WorkArea';
import Dashboard from './components/Auth/Dashboard';

// ProtectedRoute as a component inside AppRouter to use inline navigate
const ProtectedRoute = ({ children, navigate }) => {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;
  if (!user) {
    // push the login page into history and show login
    navigate('login', { fromProtected: true });
    return null;
  }
  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  navigate: PropTypes.func.isRequired,
};

// Layout stays same
const Layout = ({
  setSelectedMenuItem,
  isSidebarOpen,
  setSidebarOpen,
  selectedMenuItem,
}) => (
  <div className="flex">
    <Sidebar
      isOpen={isSidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setSelectedMenuItem={setSelectedMenuItem}
    />
    <div className="flex-1">
      <WorkArea selectedMenuItem={selectedMenuItem} />
    </div>
  </div>
);

// Map page IDs to components. Use functions for components to pass navigate prop.
const PAGES = {
  login: (props) => <Login {...props} />,
  dashboard: (props) => <Dashboard {...props} />,
  // add others like 'student','transcript' mapping to components as needed
};

export default function AppRouter() {
  // initial page from history.state or default 'login'
  const initial =
    (window.history.state && window.history.state.page) || 'login';
  const [page, setPage] = useState(initial);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);

  useEffect(() => {
    // ensure there is a state object for initial load so popstate works
    if (!window.history.state) replacePage(initial);

    // listen for back/forward
    const detach = onPopState((state) => {
      if (state && state.page) setPage(state.page);
      else setPage('login');
    });

    // listen to our custom in-app navigations
    const navHandler = (e) => {
      const s = e.detail;
      if (s && s.page) setPage(s.page);
    };
    window.addEventListener('app:navigate', navHandler);

    // allow pages to send user to home (dashboard + clear selection)
    const homeHandler = () => {
      setSelectedMenuItem(null);
      setPage('dashboard');
      window.history.pushState(
        { page: 'dashboard', ts: Date.now() },
        '',
        window.location.pathname,
      );
      window.dispatchEvent(
        new CustomEvent('app:navigate', { detail: { page: 'dashboard' } }),
      );
    };
    window.addEventListener('app:home', homeHandler);

    return () => {
      detach();
      window.removeEventListener('app:navigate', navHandler);
      window.removeEventListener('app:home', homeHandler);
    };
  }, [initial]);

  // navigate helper passed into pages
  const navigate = (to, meta) => {
    // pushState will be called by pushPage via navigate from context
    // local setPage to ensure immediate render
    setPage(to);
    window.history.pushState(
      { page: to, meta, ts: Date.now() },
      '',
      window.location.pathname,
    );
    window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { page: to, meta } }),
    );
  };

  // render current page, supply navigate + other props
  const PageComponent = PAGES[page];
  const pageProps = {
    navigate,
    setSelectedMenuItem,
    isSidebarOpen,
    setSidebarOpen,
    selectedMenuItem,
  };

  return (
    <AuthProvider>
      <NavigationProvider
        value={{
          navigate,
          replace: (p, m) => {
            window.history.replaceState(
              { page: p, meta: m },
              '',
              window.location.pathname,
            );
            setPage(p);
          },
        }}
      >
        {PageComponent ? (
          // For protected pages handle auth check inside ProtectedRoute
          page === 'dashboard' ? (
            <ProtectedRoute navigate={navigate}>
              <PageComponent {...pageProps} />
            </ProtectedRoute>
          ) : (
            <PageComponent {...pageProps} />
          )
        ) : (
          <div>Page not found</div>
        )}
      </NavigationProvider>
    </AuthProvider>
  );
}
