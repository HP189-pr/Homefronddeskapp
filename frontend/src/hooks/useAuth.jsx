// src/hooks/useAuth.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
// lightweight JWT decoder to avoid bundler import issues (browser-friendly)
const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    // base64url -> base64
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // pad base64 string
    const pad = payload.length % 4;
    const padded = payload + (pad ? '='.repeat(4 - pad) : '');
    // atob works in browser
    const str = atob(padded);
    // decode percent-encoded characters
    const json = decodeURIComponent(
      Array.prototype.map
        .call(str, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const devAutoLogin = import.meta?.env?.VITE_DEV_AUTO_LOGIN === '1';

  // On mount, restore auth state from localStorage (token + user)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    const tryDevAutoLogin = async () => {
      try {
        const res = await fetch('/api/auth/dev-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ userid: 'admin', role: 'admin' }),
        });
        if (!res.ok) return;
        const payload = await res.json();
        if (payload?.token && payload?.user) {
          localStorage.setItem('token', payload.token);
          localStorage.setItem('user', JSON.stringify(payload.user));
          setIsAuthenticated(true);
          setUser(payload.user);
          // If currently on login page, navigate to dashboard automatically
          try {
            const current = window.history.state && window.history.state.page;
            if (!current || current === 'login') {
              window.history.pushState(
                { page: 'dashboard', ts: Date.now() },
                '',
                window.location.pathname,
              );
              window.dispatchEvent(
                new CustomEvent('app:navigate', {
                  detail: { page: 'dashboard', meta: { from: 'dev-auto' } },
                }),
              );
            }
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore dev auto login errors */
      }
    };

    if (token) {
      try {
        const decoded = decodeJwt(token);
        if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
          // token expired
          logout();
          // If dev auto-login enabled, try to get a fresh token
          if (devAutoLogin) tryDevAutoLogin();
        } else {
          setIsAuthenticated(true);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch {
        logout();
        if (devAutoLogin) tryDevAutoLogin();
      }
    } else if (devAutoLogin) {
      // No token present and dev auto-login is enabled
      tryDevAutoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to dispatch in-app navigation (matches AppRouter event)
  const navigateToLoginPage = () => {
    try {
      window.history.pushState(
        { page: 'login', meta: { from: 'auth-logout' } },
        '',
        window.location.pathname,
      );
      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { page: 'login', meta: { from: 'auth-logout' } },
        }),
      );
    } catch {
      // Fallback: hard redirect
      window.location.href = '/';
    }
  };

  // Cache keys (session-only)
  const ADMIN_VERIFIED_KEY = 'admin_verified';
  const ADMIN_VERIFIED_TS_KEY = 'admin_verified_ts';
  const VERIFY_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  // Clear cached admin verification on logout
  const clearAdminVerification = () => {
    try {
      sessionStorage.removeItem(ADMIN_VERIFIED_KEY);
      sessionStorage.removeItem(ADMIN_VERIFIED_TS_KEY);
    } catch {
      /* ignore */
    }
  };

  /**
   * authFetch(url, opts)
   * - wrapper around fetch that attaches Authorization header automatically if token exists
   */
  const authFetch = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const final = {
      ...opts,
      headers,
      credentials: opts.credentials ?? 'same-origin',
    };
    return fetch(url, final);
  };

  /**
   * login(identifier, usrpassword)
   */
  const login = async (identifier, usrpassword) => {
    setLoading(true);
    const id = (identifier || '').trim().toLowerCase();
    const password = usrpassword || '';

    if (!id || !password) {
      setLoading(false);
      return false;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: id,
          usrpassword: password,
          userid: id,
          password,
        }),
      });

      if (!res.ok) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return false;
      }

      const payload = await res.json();

      if (payload?.token && payload?.user) {
        localStorage.setItem('token', payload.token);
        localStorage.setItem('user', JSON.stringify(payload.user));
        setIsAuthenticated(true);
        setUser(payload.user);
        setLoading(false);
        return true;
      }

      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    } catch {
      /* ignore */
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }
  };

  /**
   * logout()
   */
  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearAdminVerification();
    setIsAuthenticated(false);
    setUser(null);

    try {
      fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => {});
    } catch {
      // ignore
    }

    navigateToLoginPage();
  };

  /**
   * fetchUserProfile()
   * - GET /api/profile to refresh user and profile info
   */
  const fetchUserProfile = async () => {
    try {
      const res = await authFetch('/api/profile', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const payload = await res.json();
      if (payload?.user) {
        setUser(payload.user);
        try {
          localStorage.setItem('user', JSON.stringify(payload.user));
        } catch {
          /* ignore */
        }
      }
      return payload;
    } catch {
      return null;
    }
  };

  /**
   * fetchUsers()
   */
  const fetchUsers = async () => {
    if (!isAuthenticated) return [];

    try {
      const res = await authFetch('/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        return [];
      }
      const payload = await res.json();
      return payload?.users || [];
    } catch {
      return [];
    }
  };

  /**
   * verifyPassword()
   * - Requires caller to pass a password string
   * - Checks sessionStorage cache
   * - Calls backend POST /api/auth/verify-password
   */
  const verifyPassword = async (usrpassword) => {
    try {
      if (!usrpassword || typeof usrpassword !== 'string') return false;
      const trimmed = usrpassword.trim();
      if (!trimmed) return false;

      // check cache
      try {
        const cached = sessionStorage.getItem(ADMIN_VERIFIED_KEY);
        const ts = Number(sessionStorage.getItem(ADMIN_VERIFIED_TS_KEY) || '0');
        if (cached === 'true' && Date.now() - ts < VERIFY_EXPIRY_MS) {
          return true;
        }
      } catch {
        // ignore
      }

      const res = await authFetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrpassword: trimmed, password: trimmed }),
      });

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) return false;
        return false;
      }

      const payload = await res.json();
      const ok = !!(payload?.ok || payload?.verified || payload?.success);

      if (ok) {
        try {
          sessionStorage.setItem(ADMIN_VERIFIED_KEY, 'true');
          sessionStorage.setItem(ADMIN_VERIFIED_TS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      }

      return ok;
    } catch {
      /* ignore */
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        fetchUsers,
        verifyPassword,
        authFetch, // expose for convenience
        fetchUserProfile,
        devAutoLoginEnabled: devAutoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
