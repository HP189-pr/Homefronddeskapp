// src/components/Admin/PermissionsAdmin.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const PermissionsAdmin = () => {
  const { authFetch } = useAuth();
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [menus, setMenus] = useState([]);
  const [form, setForm] = useState({ roleid:'', moduleid:'', menuid:'', action:'', instituteid:'' });
  const [assignForm, setAssignForm] = useState({ userid:'', roleid:'' });

  useEffect(() => {
    (async () => {
      const [pR, rR, aR, mR, menuR] = await Promise.all([
        authFetch('/api/admin/rights/permissions'),
        authFetch('/api/admin/rights/roles'),
        authFetch('/api/admin/rights/assignments'),
        authFetch('/api/admin/rights/modules'),
        authFetch('/api/admin/rights/menus'),
      ]);
      const [pD, rD, aD, mD, menuD] = await Promise.all([pR.json(), rR.json(), aR.json(), mR.json(), menuR.json()]);
      setPerms(pD.permissions || []);
      setRoles(rD.roles || []);
      setAssignments(aD.assignments || []);
      setModules(mD.modules || []);
      setMenus(menuD.menus || []);
    })();
  }, [authFetch]);

  const create = async () => {
    const payload = {
      roleid: parseInt(form.roleid,10) || null,
      moduleid: form.moduleid ? parseInt(form.moduleid,10) : null,
      menuid: form.menuid ? parseInt(form.menuid,10) : null,
      action: form.action || null,
      instituteid: form.instituteid ? parseInt(form.instituteid,10) : null
    };
    const res = await authFetch('/api/admin/rights/permissions', {
      method:'POST', headers:{ 'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (res.ok) {
      const d = await res.json();
      setPerms(p => [...p, d]);
    } else {
      alert('Failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove permission?')) return;
  const res = await authFetch('/api/admin/rights/permissions/'+id, { method:'DELETE' });
    if (res.ok) setPerms(p => p.filter(x => x.permissionid !== id));
  };

  const createAssignment = async () => {
    if (!assignForm.userid || !assignForm.roleid) return alert('userid and roleid required');
    const payload = { userid: parseInt(assignForm.userid,10), roleid: parseInt(assignForm.roleid,10) };
  const res = await authFetch('/api/admin/rights/assignments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) return alert('Failed to assign');
    const d = await res.json();
    setAssignments(a => [...a, d]);
    setAssignForm({ userid:'', roleid:'' });
  };

  const removeAssignment = async (id) => {
    if (!confirm('Remove role assignment?')) return;
  const res = await authFetch('/api/admin/rights/assignments/'+id, { method:'DELETE' });
    if (res.ok) setAssignments(a => a.filter(x => x.id !== id));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Permissions</h2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <select value={form.roleid} onChange={e=>setForm({...form, roleid:e.target.value})} className="p-2 border">
          <option value="">Select role</option>
          {roles.map(r=> <option key={r.roleid} value={r.roleid}>{r.name}</option>)}
        </select>
        <select value={form.moduleid} onChange={e=>setForm({...form,moduleid:e.target.value, menuid:''})} className="p-2 border">
          <option value="">Module (optional)</option>
          {modules.map(m => <option key={m.moduleid} value={m.moduleid}>{m.moduleid} — {m.name}</option>)}
        </select>
        <select value={form.menuid} onChange={e=>setForm({...form,menuid:e.target.value})} className="p-2 border">
          <option value="">Menu (optional)</option>
          {menus
            .filter(m => !form.moduleid || String(m.moduleid) === String(form.moduleid))
            .map(m => <option key={m.menuid} value={m.menuid}>{m.menuid} — {m.name}</option>)}
        </select>
        <input placeholder="action (optional e.g. view)" value={form.action} onChange={e=>setForm({...form,action:e.target.value})} className="p-2 border"/>
        <input placeholder="instituteid (optional)" value={form.instituteid} onChange={e=>setForm({...form,instituteid:e.target.value})} className="p-2 border"/>
        <button onClick={create} className="p-2 bg-green-600 text-white rounded">Add Permission</button>
      </div>

        <hr className="my-4" />
        <h3 className="text-lg font-semibold mb-2">Role Assignments</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input placeholder="userid" value={assignForm.userid} onChange={e=>setAssignForm({...assignForm,userid:e.target.value})} className="p-2 border"/>
          <select value={assignForm.roleid} onChange={e=>setAssignForm({...assignForm,roleid:e.target.value})} className="p-2 border">
            <option value="">Select role</option>
            {roles.map(r=> <option key={r.roleid} value={r.roleid}>{r.name}</option>)}
          </select>
          <button onClick={createAssignment} className="p-2 bg-blue-600 text-white rounded">Assign Role</button>
        </div>

        <div className="space-y-2 mb-4">
          {assignments.map(a => (
            <div key={a.id} className="p-2 border rounded flex justify-between items-center">
              <div>id:{a.id} user:{a.userid} role:{a.roleid}</div>
              <button onClick={() => removeAssignment(a.id)} className="p-1 bg-red-600 text-white rounded">Remove</button>
            </div>
          ))}
        </div>

      <div className="space-y-2">
        {perms.map(p => (
          <div key={p.permissionid} className="p-2 border rounded flex justify-between items-center">
            <div>
              role:{p.roleid} module:{p.moduleid ?? 'any'} menu:{p.menuid ?? 'any'} institute:{p.instituteid ?? 'any'} action:{p.action ?? 'any'}
            </div>
            <button onClick={() => remove(p.permissionid)} className="p-1 bg-red-600 text-white rounded">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionsAdmin;
