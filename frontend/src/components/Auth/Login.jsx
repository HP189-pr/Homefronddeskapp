// src/components/Auth/Login.jsx
import React, { useEffect, useState, useRef } from 'react';
import Clock from './Clock';
import { useAuth } from '../../hooks/useAuth';

/**
 * Login component that works with AppRouter-style navigation:
 * - Receives `navigate` prop (function) from AppRouter
 * - Does NOT use Apollo. Holidays are loaded via fetch() to /api/holidays
 *
 * Expected REST contract:
 *  GET /api/holidays?type=recent  -> { holidays: [ { hdid, holiday_date, holiday_day, holiday_name }, ... ] }
 *  GET /api/holidays?type=upcoming -> same shape
 *
 * If your backend route differs, adjust fetchHolidayUrl below accordingly.
 */
const Login = ({ navigate }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: '', usrpassword: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showHolidays, setShowHolidays] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [holidayType, setHolidayType] = useState('upcoming');

  // keep ref to abort previous fetch if user toggles quickly
  const holidaysAbortRef = useRef(null);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (holidaysAbortRef.current) holidaysAbortRef.current.abort();
    };
  }, []);

  const fetchHolidays = async (type) => {
    // prevent multiple parallel calls
    if (holidaysAbortRef.current) {
      holidaysAbortRef.current.abort();
    }
    const controller = new AbortController();
    holidaysAbortRef.current = controller;

    setHolidayType(type);
    setHolidaysLoading(true);
    setHolidays([]);

    try {
      // adjust this URL if your backend path differs
      const url = `/api/holidays?type=${encodeURIComponent(type)}`;
      const res = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error(`Failed to load holidays (${res.status})`);
      }
      const payload = await res.json();
      // support both top-level `holidays` or type-specific keys
      const list = payload.holidays || payload.upcomingHolidays || payload.recentHolidays || [];
      setHolidays(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching holidays:', err);
      }
      setHolidays([]);
    } finally {
      setHolidaysLoading(false);
      holidaysAbortRef.current = null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleLogin = async (event) => {
    if (event && event.preventDefault) event.preventDefault();

    const identifier = (form.identifier || '').trim().toLowerCase();
    const password = form.usrpassword || '';

    if (!identifier || !password) {
      setLoginError('Both fields are required.');
      return;
    }

    setLoginError('');
    setLoading(true);

    try {
      // useAuth.login should return truthy on success
      const success = await login(identifier, password);
      if (success) {
        // navigate must be the function from AppRouter: navigate('dashboard', meta)
        navigate('dashboard', { from: 'login' });
      } else {
        setLoginError('Invalid user ID or password. Make sure your User ID/User Code is correct.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please check your credentials or contact admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-r from-teal-500 via-blue-600 to-indigo-800">
      {/* Clock Display */}
      <div className="absolute top-1 right-2 text-white">
        <Clock className="text-xl" />
      </div>

      {/* Holidays Button */}
      <div className="absolute top-4 left-4">
        <button
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-green-500 to-teal-500 
              text-white px-4 py-2 rounded-lg shadow-lg hover:opacity-90 transition font-semibold"
          onClick={() => setShowHolidays((prev) => !prev)}
          aria-expanded={showHolidays}
          aria-controls="holidays-panel"
        >
          Show Holidays <span className="ml-2">☰</span>
        </button>

        {showHolidays && (
          <div
            id="holidays-panel"
            className="mt-2 bg-white p-4 rounded-lg shadow-lg border border-gray-300 w-72"
          >
            <h3 className="text-center text-lg font-semibold text-gray-800 mb-2">
              Select Holiday Type
            </h3>

            {/* Toggle Buttons for Recent & Upcoming Holidays */}
            <div className="flex justify-center gap-2">
              <button
                className={`px-3 py-1 rounded-md font-medium ${
                  holidayType === 'recent' ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => fetchHolidays('recent')}
                type="button"
                disabled={holidaysLoading}
              >
                Recent Holidays
              </button>
              <button
                className={`px-3 py-1 rounded-md font-medium ${
                  holidayType === 'upcoming' ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => fetchHolidays('upcoming')}
                type="button"
                disabled={holidaysLoading}
              >
                Upcoming Holidays
              </button>
            </div>

            {/* Holiday List Display */}
            {holidaysLoading ? (
              <p className="text-center text-purple-600 mt-2">Loading...</p>
            ) : (
              <div className="space-y-2 mt-3">
                {Array.isArray(holidays) && holidays.length > 0 ? (
                  holidays.map((holiday) => (
                    <div
                      key={holiday.hdid || `${holiday.holiday_date}-${holiday.holiday_name}`}
                      className="bg-gradient-to-r from-teal-500 to-green-500 
                        text-white p-2 rounded-md text-center shadow-md"
                    >
                      {formatDate(holiday.holiday_date)},{' '}
                      {holiday.holiday_day?.slice(0, 3)} - {holiday.holiday_name}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No holidays found.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Login Form */}
      <div className="flex flex-col md:flex-row bg-white rounded-xl opacity-90 shadow-lg w-full max-w-3xl border-4 border-indigo-800">
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-4">Welcome</h2>
          <p className="text-gray-600 text-center mb-6">Please log in to continue.</p>

          {/* Form handles Enter key automatically */}
          <form onSubmit={handleLogin} className="space-y-3" aria-label="Login form">
            <label htmlFor="identifier" className="sr-only">
              User ID or User Code
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="User ID or User Code"
              value={form.identifier}
              onChange={handleChange}
              className="w-full p-3 border rounded-md mb-1 focus:ring-4 focus:ring-green-500 transition outline-none"
              autoFocus
              autoComplete="username"
              aria-required="true"
              disabled={loading}
            />

            <label htmlFor="usrpassword" className="sr-only">
              Password
            </label>
            <input
              id="usrpassword"
              name="usrpassword"
              type="password"
              placeholder="Password"
              value={form.usrpassword}
              onChange={handleChange}
              className="w-full p-3 border rounded-md mb-1 focus:ring-4 focus:ring-green-500 transition outline-none"
              autoComplete="current-password"
              aria-required="true"
              disabled={loading}
            />

            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}

            <p className="text-xs text-center text-gray-500">Tip: User ID / User Code are not case-sensitive.</p>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-800 to-green-500 hover:opacity-80 text-white py-2 rounded-md mt-2 transition font-semibold disabled:opacity-60"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                onClick={() => navigate('forgot-password')}
                className="text-sm text-indigo-700 hover:underline"
                disabled={loading}
              >
                Forgot password?
              </button>
              <div />
            </div>
          </form>
        </div>

        {/* Right side visual / brand panel */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-indigo-900 to-indigo-600 text-white rounded-r-xl p-8 flex-col justify-center items-center">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">FrontDesk</h3>
            <p className="text-sm mb-4">Admin Portal — manage modules & user access</p>
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-2xl font-semibold">
              FD
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
