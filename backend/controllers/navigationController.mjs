import * as svc from '../services/navigationService.mjs';

export async function listModules(_req, res, next) {
  try { const rows = await svc.listModules(); res.json(rows); } catch (e) { next(e); }
}

export async function createModule(req, res, next) {
  try { const row = await svc.createModule(req.body || {}); res.status(201).json(row); } catch (e) { next(e); }
}

export async function listMenus(req, res, next) {
  try { const rows = await svc.listMenus(req.query || {}); res.json(rows); } catch (e) { next(e); }
}

export async function createMenu(req, res, next) {
  try { const row = await svc.createMenu(req.body || {}); res.status(201).json(row); } catch (e) { next(e); }
}

export async function menusByModule(req, res, next) {
  try { const rows = await svc.listMenusByModule(req.params.id); res.json(rows); } catch (e) { next(e); }
}

export async function myNavigation(_req, res, next) {
  try { const data = await svc.listNavigation(); res.json(data); } catch (e) { next(e); }
}

export async function listUserPermissions(req, res, next) {
  try { const rows = await svc.listUserPermissions(req.query || {}); res.json(rows); } catch (e) { next(e); }
}

export async function createUserPermission(req, res, next) {
  try { const row = await svc.createUserPermission(req.body || {}); res.status(201).json(row); } catch (e) { next(e); }
}

export async function updateUserPermission(req, res, next) {
  try {
    const row = await svc.updateUserPermission(req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function deleteUserPermission(req, res, next) {
  try { const rows = await svc.deleteUserPermission(req.params.id); res.json({ ok: rows > 0 }); } catch (e) { next(e); }
}

export async function listUsers(_req, res, next) {
  try { const rows = await svc.listUsers(); res.json(rows); } catch (e) { next(e); }
}

export async function getUser(req, res, next) {
  try { const row = await svc.getUser(req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); }
}

export async function createUser(req, res, next) {
  try { const row = await svc.createUser(req.body || {}); res.status(201).json(row); } catch (e) { next(e); }
}

export async function updateUser(req, res, next) {
  try {
    const row = await svc.updateUser(req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export default {
  listModules,
  createModule,
  listMenus,
  createMenu,
  menusByModule,
  myNavigation,
  listUserPermissions,
  createUserPermission,
  updateUserPermission,
  deleteUserPermission,
  listUsers,
  getUser,
  createUser,
  updateUser,
};