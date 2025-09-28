// src/components/Admin/AdminPanelAccess.jsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const AdminPanelAccess = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await verifyPassword(password);
      if (ok) {
        setPassword('');
        onSuccess();
      } else {
        setError('❌ Invalid admin password.');
      }
    } catch (err) {
      console.error('AdminPanelAccess error', err);
      setError('Error verifying password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>🔐 Secure Admin Access</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter Admin Password"
          style={{
            padding: '10px',
            width: '250px',
            marginBottom: '10px',
            borderRadius: '5px',
            border: '1px solid #ccc',
          }}
          disabled={loading}
        />
        <br />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

export default AdminPanelAccess;
