// backend/services/rightsService.mjs
import { Role } from '../models/role.mjs';
import { Permission } from '../models/permission.mjs';
import { RoleAssignment } from '../models/roleAssignment.mjs';
import { Module } from '../models/module.mjs';
import { Menu } from '../models/menu.mjs';

export const rightsService = {
  // Roles
  async listRoles() {
    return Role.findAll({ order: [['roleid', 'ASC']] });
  },
  async createRole({ name, description }) {
    if (!name) throw new Error('Missing role name');
    return Role.create({ name, description: description || null });
  },
  async updateRole(roleid, payload) {
    const role = await Role.findOne({ where: { roleid } });
    if (!role) return null;
    const allowed = ['name', 'description'];
    const updates = {};
    for (const k of allowed) if (payload[k] !== undefined) updates[k] = payload[k];
    await role.update(updates);
    return role;
  },
  async deleteRole(roleid) {
    return Role.destroy({ where: { roleid } });
  },

  // Permissions
  async listPermissions(filter = {}) {
    const where = {};
    if (filter.roleid) where.roleid = filter.roleid;
    if (filter.moduleid !== undefined) where.moduleid = filter.moduleid;
    if (filter.menuid !== undefined) where.menuid = filter.menuid;
    if (filter.instituteid !== undefined) where.instituteid = filter.instituteid;
    return Permission.findAll({ where, order: [['permissionid', 'ASC']] });
  },
  async createPermission({ roleid, moduleid = null, menuid = null, action = null, instituteid = null }) {
    if (!roleid) throw new Error('Missing roleid');
    return Permission.create({ roleid, moduleid, menuid, action, instituteid });
  },
  async deletePermission(permissionid) {
    return Permission.destroy({ where: { permissionid } });
  },

  // Assignments
  async listAssignments(filter = {}) {
    const where = {};
    if (filter.userid) where.userid = filter.userid;
    return RoleAssignment.findAll({ where, order: [['id', 'ASC']] });
  },
  async createAssignment({ userid, roleid }) {
    if (!userid || !roleid) throw new Error('Missing userid or roleid');
    return RoleAssignment.create({ userid, roleid });
  },
  async deleteAssignment(id) {
    return RoleAssignment.destroy({ where: { id } });
  },

  // Masters
  async listModules() {
    return Module.findAll({ order: [['moduleid', 'ASC']] });
  },
  async listMenus() {
    return Menu.findAll({ order: [['menuid', 'ASC']] });
  },
};

export default rightsService;