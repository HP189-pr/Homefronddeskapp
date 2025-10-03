// src/components/Admin/UsersAdmin.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { formatDateTimeIST } from '../../utils/date';

const UsersAdmin = () => {
  const { authFetch, fetchUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ userid: '', usrpassword: '', first_name: '', last_name: '', usertype: 'user', instituteid: '', email: ''});
  const [newPassword, setNewPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsUser, setLogsUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [menus, setMenus] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [permForm, setPermForm] = useState({ roleid:'', moduleid:'', menuid:'', action:'view', instituteid:'' });
  const [permsByRole, setPermsByRole] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      // Debug: show whether token exists in browser storage (helps diagnose missing Authorization)
      try { console.debug('UsersAdmin.load: token present=', !!localStorage.getItem('token'), 'tokenPreview=', (localStorage.getItem('token')||'').slice(0,16)+'...'); } catch (e) {}
      // Use admin endpoint so we get full user list from backend
      const res = await authFetch('/api/admin/users', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      try { console.debug('UsersAdmin.load: response status=', res.status, 'ok=', res.ok); } catch (e) {}
      if (!res.ok) {
        console.error('Failed to load users, status=', res.status);
        setUsers([]);
      } else {
        const payload = await res.json();
        try { console.debug('UsersAdmin.load: payload=', payload); } catch (e) {}
        // payload may be { users: [...] } or an array
        if (Array.isArray(payload)) setUsers(payload);
        else setUsers(payload?.users || []);
      }
    } catch (e) {
      console.error('load users', e);
      setUsers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    (async () => {
      const [rR, mR, menuR] = await Promise.all([
        authFetch('/api/admin/rights/roles'),
        authFetch('/api/admin/rights/modules'),
        authFetch('/api/admin/rights/menus'),
      ]);
      const [rD, mD, menuD] = await Promise.all([rR.json(), mR.json(), menuR.json()]);
      setRoles(rD.roles || []);
      setModules(mD.modules || []);
      setMenus(menuD.menus || []);
    })();
  }, [authFetch]);

  // compute permissions rows grouped by module/menu for the active user
  const permsForActiveUser = useMemo(() => {
    if (!activeUser) return [];
    // Backend returns assignments separate; permissions are global per role. Fetch effective perms on demand below.
    return [];
  }, [activeUser]);

  const openCreate = () => { setEditing(null); setForm({ userid:'', usrpassword:'', first_name:'', last_name:'', usertype:'user', instituteid:'', email:''}); setShowForm(true); };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ userid: u.userid, usrpassword: '', first_name: u.first_name || '', last_name: u.last_name || '', usertype: u.usertype || 'user', instituteid: u.instituteid || '', email: u.email || '' });
    setNewPassword('');
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (editing) {
        const res = await authFetch('/api/admin/users/'+editing.id, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Update failed');
        const updated = await res.json();
        setUsers(u => u.map(x => x.id === updated.id ? updated : x));
      } else {
        if (!payload.userid || !payload.usrpassword) { alert('Userid and password required'); return; }
        const res = await authFetch('/api/admin/users', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Create failed');
        const created = await res.json();
        setUsers(u => [...u, created]);
      }
      setShowForm(false);
    } catch (e) { console.error(e); alert(e.message || 'Save error'); }
  };

  const openLogs = async (u) => {
    try {
      setLogsUser(u);
      const res = await authFetch(`/api/admin/users/${u.id}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const payload = await res.json();
      setLogs(payload.logs || []);
    } catch (e) { console.error('logs', e); setLogs([]); }
  };

  const openRights = async (u) => {
    setActiveUser(u);
    const res = await authFetch(`/api/admin/rights/assignments?userid=${u.id}`);
    if (res.ok) {
      const d = await res.json();
      setAssignments(d.assignments || []);
      // Initialize add-permission form default role
      const firstRole = (d.assignments || [])[0]?.roleid || '';
      setPermForm(p => ({ ...p, roleid: firstRole ? String(firstRole) : '' }));
      // Preload permissions for these roles
      const map = {};
      for (const a of d.assignments || []) {
        const r = await authFetch(`/api/admin/rights/permissions?roleid=${a.roleid}`);
        const pd = r.ok ? await r.json() : { permissions: [] };
        map[a.roleid] = pd.permissions || [];
      }
      setPermsByRole(map);
    } else {
      setAssignments([]);
    }
  };

  const hasRole = (roleid) => assignments.some(a => a.roleid === roleid);
  const toggleRole = async (roleid) => {
    if (!activeUser) return;
    try {
      if (hasRole(roleid)) {
        // find assignment id
        const a = assignments.find(x => x.roleid === roleid);
        if (!a) return;
        const res = await authFetch(`/api/admin/rights/assignments/${a.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to unassign');
        setAssignments(prev => prev.filter(x => x.id !== a.id));
      } else {
        const res = await authFetch('/api/admin/rights/assignments', {
          method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ userid: activeUser.id, roleid })
        });
        if (!res.ok) throw new Error('Failed to assign');
        const created = await res.json();
        setAssignments(prev => [...prev, created]);
        // also prefetch permissions for this role
        const r = await authFetch(`/api/admin/rights/permissions?roleid=${roleid}`);
        const pd = r.ok ? await r.json() : { permissions: [] };
        setPermsByRole(prev => ({ ...prev, [roleid]: pd.permissions || [] }));
      }
    } catch (e) { console.error(e); }
  };

  const addPermission = async () => {
    try {
      if (!permForm.roleid) return alert('Select a role');
      const payload = {
        roleid: parseInt(permForm.roleid, 10),
        moduleid: permForm.moduleid ? parseInt(permForm.moduleid, 10) : null,
        menuid: permForm.menuid ? parseInt(permForm.menuid, 10) : null,
        action: permForm.action || null,
        instituteid: permForm.instituteid ? parseInt(permForm.instituteid, 10) : null,
      };
      const res = await authFetch('/api/admin/rights/permissions', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) return alert('Failed to add permission');
      const created = await res.json();
      setPermsByRole(prev => {
        const roleId = payload.roleid;
        const arr = prev[roleId] ? [...prev[roleId]] : [];
        arr.push(created);
        return { ...prev, [roleId]: arr };
      });
      // Reset action only
      setPermForm(p => ({ ...p, action: 'view' }));
    } catch (e) { console.error(e); alert('Add permission error'); }
  };

  const removePermission = async (roleid, permissionid) => {
    try {
      if (!confirm('Remove permission?')) return;
      const res = await authFetch(`/api/admin/rights/permissions/${permissionid}`, { method:'DELETE' });
      if (!res.ok) return alert('Failed to remove');
      setPermsByRole(prev => ({ ...prev, [roleid]: (prev[roleid] || []).filter(p => p.permissionid !== permissionid) }));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">User Management</h2>
        <div>
          <button onClick={openCreate} className="px-3 py-2 bg-green-600 text-white rounded">Add User</button>
          <button onClick={load} className="ml-2 px-3 py-2 bg-gray-200 rounded">Refresh</button>
        </div>
      </div>

      <div className="bg-white shadow rounded">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">User ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Institute</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="p-4">No users found</td></tr>
            ) : users.map((u, idx) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{idx+1}</td>
                <td className="px-4 py-2"><strong>{u.userid}</strong></td>
                <td className="px-4 py-2">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-2">{u.email || '-'}</td>
                <td className="px-4 py-2">{u.usertype}</td>
                <td className="px-4 py-2">{u.instituteid || '-'}</td>
                <td className="px-4 py-2 space-x-2">
                  <button onClick={()=>openEdit(u)} className="px-2 py-1 bg-blue-500 text-white rounded">Edit</button>
                  <button onClick={()=>openLogs(u)} className="px-2 py-1 bg-gray-200 rounded">Logs</button>
                  <button onClick={()=>openRights(u)} className="px-2 py-1 bg-indigo-600 text-white rounded">Rights</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal/form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow w-96">
            <h3 className="text-lg font-semibold mb-2">{editing ? 'Edit user' : 'Create user'}</h3>
            <div className="space-y-2">
              <input value={form.userid} onChange={e=>setForm({...form, userid:e.target.value})} placeholder="User ID" className="w-full p-2 border" disabled={!!editing} />
              {!editing && (
                <input value={form.usrpassword} onChange={e=>setForm({...form, usrpassword:e.target.value})} placeholder="Password (required for create)" className="w-full p-2 border" />
              )}
              <input value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} placeholder="First name" className="w-full p-2 border" />
              <input value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} placeholder="Last name" className="w-full p-2 border" />
              <input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="Email" className="w-full p-2 border" />
              <select value={form.usertype} onChange={e=>setForm({...form, usertype:e.target.value})} className="w-full p-2 border">
                <option value="user">User</option>
                <option value="operator">Operator</option>
                <option value="superuser">Superuser</option>
                <option value="admin">Admin</option>
              </select>
              {editing && (
                <div className="mt-2 p-2 border rounded">
                  <div className="text-sm font-medium mb-1">Reset password</div>
                  <div className="flex gap-2">
                    <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password" className="flex-1 p-2 border" />
                    <button onClick={async ()=>{
                      if (!newPassword || newPassword.trim().length < 4) { alert('Password too short'); return; }
                      const res = await authFetch('/api/admin/users/'+editing.id+'/password', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ newPassword }) });
                      if (!res.ok) { alert('Failed to change password'); return; }
                      setNewPassword('');
                      alert('Password updated');
                    }} className="px-3 py-2 bg-indigo-600 text-white rounded">Update</button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={()=>setShowForm(false)} className="px-3 py-2 mr-2">Cancel</button>
              <button onClick={handleSave} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Logs drawer */}
      {logsUser && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Logs for {logsUser.userid}</h3>
            <button onClick={()=>{ setLogsUser(null); setLogs([]); }} className="px-2 py-1">Close</button>
          </div>
          <div className="overflow-auto h-[80%]">
            {logs.length === 0 ? <div className="text-sm text-gray-600">No logs</div> : (
              <ul className="space-y-2">
                {logs.map(l => (
                  <li key={l.id} className="p-2 border rounded">
                    <div className="text-sm text-gray-700">{l.action}</div>
                    <div className="text-xs text-gray-500">{formatDateTimeIST(l.createdat)}</div>
                    {l.meta && <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto">{JSON.stringify(l.meta)}</pre>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Rights drawer */}
      {activeUser && (
        <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-semibold">Rights for {activeUser.first_name || activeUser.userid}</h3>
              <div className="text-sm text-gray-500">UserID: {activeUser.userid} · Email: {activeUser.email || '-'} · Type: {activeUser.usertype}</div>
            </div>
            <button onClick={()=>{ setActiveUser(null); setAssignments([]); }} className="px-2 py-1">Close</button>
          </div>

          <div className="space-y-4 overflow-auto h-[80%] pr-2">
            <section className="border rounded p-3">
              <h4 className="font-semibold mb-2">Roles</h4>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <label key={r.roleid} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={hasRole(r.roleid)} onChange={()=>toggleRole(r.roleid)} />
                    <span className="font-medium">{r.name}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="border rounded p-3">
              <h4 className="font-semibold mb-2">Add permission for this user</h4>
              <div className="grid grid-cols-1 gap-2">
                <select value={permForm.roleid} onChange={e=>setPermForm({...permForm, roleid: e.target.value})} className="p-2 border">
                  <option value="">Select role</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.roleid}>{roles.find(r=>r.roleid===a.roleid)?.name || a.roleid}</option>
                  ))}
                </select>
                <select value={permForm.moduleid} onChange={e=>setPermForm({...permForm, moduleid: e.target.value, menuid: ''})} className="p-2 border">
                  <option value="">Module (optional)</option>
                  {modules.map(m => <option key={m.moduleid} value={m.moduleid}>{m.moduleid} — {m.name}</option>)}
                </select>
                <select value={permForm.menuid} onChange={e=>setPermForm({...permForm, menuid: e.target.value})} className="p-2 border">
                  <option value="">Menu (optional)</option>
                  {menus.filter(m => !permForm.moduleid || String(m.moduleid)===String(permForm.moduleid)).map(m => (
                    <option key={m.menuid} value={m.menuid}>{m.menuid} — {m.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 items-center">
                  <select value={permForm.action} onChange={e=>setPermForm({...permForm, action: e.target.value})} className="p-2 border">
                    <option value="">any</option>
                    <option value="view">view</option>
                    <option value="add">add</option>
                    <option value="edit">edit</option>
                    <option value="delete">delete</option>
                  </select>
                  <input value={permForm.instituteid} onChange={e=>setPermForm({...permForm, instituteid: e.target.value})} placeholder="instituteid (optional)" className="p-2 border flex-1"/>
                  <button onClick={addPermission} className="px-3 py-2 bg-green-600 text-white rounded">Add</button>
                </div>
              </div>
            </section>

            <section className="border rounded p-3">
              <h4 className="font-semibold mb-2">Effective permissions</h4>
              <p className="text-sm text-gray-500 mb-2">Permissions are granted via roles above. To add more, go to User Rights page.</p>
              <EffectivePermissions assignments={assignments} modules={modules} menus={menus} authFetch={authFetch} />
            </section>

            <section className="border rounded p-3">
              <h4 className="font-semibold mb-2">Role permissions</h4>
              {assignments.length === 0 ? (
                <div className="text-sm text-gray-600">Assign a role to manage permissions.</div>
              ) : (
                <div className="space-y-3">
                  {assignments.map(a => {
                    const list = permsByRole[a.roleid] || [];
                    return (
                      <div key={a.id} className="border rounded">
                        <div className="px-3 py-2 bg-gray-50 font-medium">{roles.find(r=>r.roleid===a.roleid)?.name || `Role ${a.roleid}`}</div>
                        <div className="p-2">
                          {list.length === 0 ? (
                            <div className="text-sm text-gray-500">No permissions</div>
                          ) : (
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left px-2 py-1">Module</th>
                                  <th className="text-left px-2 py-1">Menu</th>
                                  <th className="text-left px-2 py-1">Action</th>
                                  <th className="text-left px-2 py-1">Institute</th>
                                  <th className="px-2 py-1">Remove</th>
                                </tr>
                              </thead>
                              <tbody>
                                {list.map(p => (
                                  <tr key={p.permissionid} className="border-t">
                                    <td className="px-2 py-1">{p.moduleid ? (modules.find(m=>m.moduleid===p.moduleid)?.name || p.moduleid) : 'any'}</td>
                                    <td className="px-2 py-1">{p.menuid ? (menus.find(m=>m.menuid===p.menuid)?.name || p.menuid) : 'any'}</td>
                                    <td className="px-2 py-1">{p.action || 'any'}</td>
                                    <td className="px-2 py-1">{p.instituteid || 'any'}</td>
                                    <td className="px-2 py-1 text-right"><button onClick={()=>removePermission(a.roleid, p.permissionid)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersAdmin;

// Lightweight component to compute and render effective permissions for a user based on role assignments
const EffectivePermissions = ({ assignments, modules, menus, authFetch }) => {
  const [permsByRole, setPermsByRole] = useState({});

  useEffect(() => {
    (async () => {
      const map = {};
      for (const a of assignments) {
        const res = await authFetch(`/api/admin/rights/permissions?roleid=${a.roleid}`);
        const d = res.ok ? await res.json() : { permissions: [] };
        map[a.roleid] = d.permissions || [];
      }
      setPermsByRole(map);
    })();
  }, [assignments, authFetch]);

  const merged = useMemo(() => {
    const all = [];
    Object.values(permsByRole).forEach(arr => { all.push(...arr); });
    // group by module/menu/action
    const key = (p) => `${p.moduleid || 'any'}|${p.menuid || 'any'}|${p.action || 'any'}|${p.instituteid || 'any'}`;
    const map = new Map();
    for (const p of all) map.set(key(p), p);
    return Array.from(map.values());
  }, [permsByRole]);

  const moduleName = (id) => (id ? (modules.find(m => m.moduleid === id)?.name || id) : 'any');
  const menuName = (id) => (id ? (menus.find(m => m.menuid === id)?.name || id) : 'any');

  return (
    <div className="border rounded overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">Module</th>
            <th className="px-3 py-2 text-left">Menu</th>
            <th className="px-3 py-2 text-left">Action</th>
            <th className="px-3 py-2 text-left">Institute</th>
          </tr>
        </thead>
        <tbody>
          {merged.length === 0 ? (
            <tr><td className="px-3 py-4 text-gray-500" colSpan={4}>No permissions</td></tr>
          ) : merged.map((p, idx) => (
            <tr className="border-t" key={idx}>
              <td className="px-3 py-2">{moduleName(p.moduleid)}</td>
              <td className="px-3 py-2">{menuName(p.menuid)}</td>
              <td className="px-3 py-2">{p.action || 'any'}</td>
              <td className="px-3 py-2">{p.instituteid || 'any'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
