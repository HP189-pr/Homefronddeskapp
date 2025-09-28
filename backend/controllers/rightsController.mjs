// backend/controllers/rightsController.mjs
import { rightsService } from '../services/rightsService.mjs';

export const rightsController = {
  // Roles
  async listRoles(req, res, next) {
    try { const roles = await rightsService.listRoles(); res.json({ roles }); } catch (e) { next(e); }
  },
  async createRole(req, res, next) {
    try { const { name, description } = req.body || {}; const role = await rightsService.createRole({ name, description }); res.json(role); } catch (e) { next(e); }
  },
  async updateRole(req, res, next) {
    try { const id = parseInt(req.params.roleid, 10); const role = await rightsService.updateRole(id, req.body || {}); if (!role) return res.status(404).json({ error: 'Role not found' }); res.json(role); } catch (e) { next(e); }
  },
  async deleteRole(req, res, next) {
    try { const id = parseInt(req.params.roleid, 10); const rows = await rightsService.deleteRole(id); res.json({ ok: rows > 0 }); } catch (e) { next(e); }
  },

  // Permissions
  async listPermissions(req, res, next) {
    try {
      const filter = {};
      if (req.query.roleid) filter.roleid = parseInt(req.query.roleid, 10);
      if (req.query.moduleid) filter.moduleid = parseInt(req.query.moduleid, 10);
      if (req.query.menuid) filter.menuid = parseInt(req.query.menuid, 10);
      if (req.query.instituteid) filter.instituteid = parseInt(req.query.instituteid, 10);
      const permissions = await rightsService.listPermissions(filter);
      res.json({ permissions });
    } catch (e) { next(e); }
  },
  async createPermission(req, res, next) {
    try {
      const { roleid, moduleid = null, menuid = null, action = null, instituteid = null } = req.body || {};
      const p = await rightsService.createPermission({ roleid, moduleid, menuid, action, instituteid });
      res.json(p);
    } catch (e) { next(e); }
  },
  async deletePermission(req, res, next) {
    try { const id = parseInt(req.params.id, 10); const rows = await rightsService.deletePermission(id); res.json({ ok: rows > 0 }); } catch (e) { next(e); }
  },

  // Assignments
  async listAssignments(req, res, next) {
    try {
      const filter = {};
      if (req.query.userid) filter.userid = parseInt(req.query.userid, 10);
      const assignments = await rightsService.listAssignments(filter);
      res.json({ assignments });
    } catch (e) { next(e); }
  },
  async createAssignment(req, res, next) {
    try { const { userid, roleid } = req.body || {}; const rec = await rightsService.createAssignment({ userid, roleid }); res.json(rec); } catch (e) { next(e); }
  },
  async deleteAssignment(req, res, next) {
    try { const id = parseInt(req.params.id, 10); const rows = await rightsService.deleteAssignment(id); res.json({ ok: rows > 0 }); } catch (e) { next(e); }
  },

  // Masters
  async listModules(req, res, next) {
    try { const modules = await rightsService.listModules(); res.json({ modules }); } catch (e) { next(e); }
  },
  async listMenus(req, res, next) {
    try { const menus = await rightsService.listMenus(); res.json({ menus }); } catch (e) { next(e); }
  },
};

export default rightsController;