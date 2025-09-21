// src/components/Admin/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import { FaKey, FaEdit } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

const AdminPanel = () => {
  const { user, fetchUsers: fetchUsersFromAuth } = useAuth();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  const [newUser, setNewUser] = useState({
    usercode: '',
    password: '',
    usertype: 'user',
  });
  const [addingUser, setAddingUser] = useState(false);

  const [passwordEdit, setPasswordEdit] = useState(null); // { userid, newPassword, confirmPassword }
  const [changingPassword, setChangingPassword] = useState(false);

  // Require admin
  useEffect(() => {
    if (!user || user.usertype !== 'admin') return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);

    // Prefer fetchUsers from useAuth if available
    if (typeof fetchUsersFromAuth === 'function') {
      try {
        const list = await fetchUsersFromAuth();
        setUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('fetchUsers error (auth):', err);
        setUsersError('Failed to load users.');
      } finally {
        setLoadingUsers(false);
      }
      return;
    }

    // Fallback: GET /api/users
    try {
      const res = await fetch('/api/users', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const payload = await res.json();
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsersError('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.usercode?.trim() || !newUser.password) {
      alert('Usercode and password are required.');
      return;
    }
    if (!['admin', 'user', 'moderator'].includes(newUser.usertype)) {
      alert('Please select a valid user type.');
      return;
    }

    setAddingUser(true);
    try {
      const payload = {
        usercode: newUser.usercode.trim().toLowerCase(), // case-insensitive rule
        usrpassword: newUser.password,
        usertype: newUser.usertype,
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Failed to add user: ${res.status} ${errText}`);
      }

      // refresh list
      await loadUsers();
      setNewUser({ usercode: '', password: '', usertype: 'user' });
    } catch (err) {
      console.error('Error adding user:', err);
      alert('Failed to add user. Check console for details.');
    } finally {
      setAddingUser(false);
    }
  };

  const openChangePassword = (u) => {
    setPasswordEdit({ userid: u.userid, newPassword: '', confirmPassword: '' });
  };

  const handleChangePassword = async () => {
    if (!passwordEdit) return;
    const { userid, newPassword, confirmPassword } = passwordEdit;
    if (!newPassword || !confirmPassword) {
      alert('Please enter and confirm a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      // POST /api/users/:id/change-password { usrpassword: '...' }
      const res = await fetch(`/api/users/${encodeURIComponent(userid)}/change-password`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrpassword: newPassword }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Status ${res.status} ${txt}`);
      }

      alert('Password changed successfully.');
      setPasswordEdit(null);
      await loadUsers();
    } catch (err) {
      console.error('Error changing password:', err);
      alert('Failed to change password. Check console for details.');
    } finally {
      setChangingPassword(false);
    }
  };

  // If not admin, show access denied
  if (!user || user.usertype !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white p-8 rounded shadow text-center">
          <h2 className="text-xl font-semibold mb-2">Admin Panel — Access Denied</h2>
          <p className="text-gray-600">You must be an administrator to view this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-2xl font-semibold mb-6">Admin Panel</h1>

      {/* Add User Form */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Add User</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Usercode"
            className="border p-2 rounded"
            value={newUser.usercode}
            onChange={(e) => setNewUser({ ...newUser, usercode: e.target.value })}
            aria-label="Usercode"
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 rounded"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            aria-label="Password"
          />
          <select
            className="border p-2 rounded"
            value={newUser.usertype}
            onChange={(e) => setNewUser({ ...newUser, usertype: e.target.value })}
            aria-label="User type"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
          <button
            onClick={handleAddUser}
            className={`bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-60`}
            disabled={addingUser}
            aria-busy={addingUser}
