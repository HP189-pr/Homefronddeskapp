// src/hooks/useAuth.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import jwt_decode from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // On mount, restore auth state from localStorage (token + user)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token) {
      try {
        const decoded = jwt_decode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          // token expired
          logout();
        } else {
          setIsAuthenticated(true);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Invalid token, logging out', err);
        logout();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to dispatch in-app navigation (matches AppRouter event)
  const navigateToLoginPage = () => {
    try {
      window.history.pushState({ page: 'login', meta: { from: 'auth-logout' } }, '', window.location.pathname);
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'login', meta: { from: 'auth-logout' } } }));
    } catch (err) {
      // Fallback: hard redirect
      window.location.href = '/';
    }
  };

  /**
   * login(identifier, usrpassword)
   * - identifier is normalized to lower-case (case-insensitive rule)
   * - POST /api/login expected response { token, user }
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
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, usrpassword: password }),
      });

      if (!res.ok) {
        // 401 or other http errors
        console.error('Login failed status:', res.status);
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return false;
      }

      const payload = await res.json();

      // Expecting payload: { token: '...', user: { ... } }
      if (payload?.token && payload?.user) {
        localStorage.setItem('token', payload.token);
        localStorage.setItem('user', JSON.stringify(payload.user));
        setIsAuthenticated(true);
        setUser(payload.user);
        setLoading(false);
        return true;
      }

      // Unexpected payload
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    } catch (err) {
      console.error('Login error:', err);
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }
  };

  /**
   * logout()
   * - clears local storage and sends the user back to the login page using in-app navigation
   */
  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);

    // Optionally notify backend (if you have a logout endpoint)
    try {
      // Best-effort notify (no await blocking)
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // Navigate to the login page using AppRouter's custom event so SPA state remains consistent
    navigateToLoginPage();
  };

  /**
   * fetchUsers()
   * - GET /api/users -> { users: [...] }
   * - returns [] if not authenticated or on error
   */
  const fetchUsers = async () => {
    if (!isAuthenticated) return [];

    try {
      const res = await fetch('/api/users', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        console.error('Failed to fetch users', res.status);
        return [];
      }
      const payload = await res.json();
      return payload?.users || [];
    } catch (err) {
      console.error('fetchUsers error', err);
      return [];
    }
  };

  /**
   * verifyPassword()
   * - prompts the user for their password and sends it to POST /api/verify-password
   * - expects { ok: true } or similar
   * - returns boolean
   */
  const verifyPassword = async () => {
    // It's better UX to use a modal; for now keep the prompt to match previous behaviour
    const usrpassword = prompt('Enter your password to proceed:');
    if (!usrpassword) return false;

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrpassword }),
      });

      if (!res.ok) {
        alert('Incorrect password!');
        return false;
      }

      const payload = await res.json();
      // Accept several shapes: { ok: true }, { verified: true }, { success: true }
      if (payload?.ok || payload?.verified || payload?.success) {
        return true;
      }

      alert('Incorrect password!');
      return false;
    } catch (err) {
      console.error('verifyPassword error', err);
      alert('Error verifying password!');
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
