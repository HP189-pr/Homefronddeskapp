import bcrypt from 'bcrypt';
import { Module } from '../models/module.mjs';
import { Menu } from '../models/menu.mjs';
import { Permission as UserPermission } from '../models/permission.mjs';
import { User } from '../models/user.mjs';

export async function listModules() {
  return Module.findAll({ order: [['moduleid', 'ASC']] });
}

export async function createModule({ name }) {
  if (!name) throw new Error('name required');
  return Module.create({ name });
}

export async function listMenus(filter = {}) {
  const where = {};
  if (filter.module) where.moduleid = filter.module;
  return Menu.findAll({ where, order: [['menuid', 'ASC']] });
}

export async function createMenu({ name, moduleid, menuid }) {
  if (!name || !moduleid) throw new Error('name and module required');
  let finalId = menuid;
  if (!finalId) {
    const max = await Menu.max('menuid');
    finalId = (Number.isFinite(max) ? max : 0) + 1;
  }
  return Menu.create({ menuid: finalId, name, moduleid });
}

export async function listMenusByModule(moduleid) {
  return Menu.findAll({ where: { moduleid }, order: [['menuid', 'ASC']] });
}

export async function listNavigation() {
  const [modules, menus] = await Promise.all([
    listModules(),
    listMenus(),
  ]);
  return { modules, menus };
}

export async function listUserPermissions(filter = {}) {
  const where = {};
  ['userid', 'moduleid', 'menuid'].forEach((k) => { if (filter[k]) where[k] = filter[k]; });
  return UserPermission.findAll({ where, order: [['permitid', 'ASC']] });
}

export async function createUserPermission(payload = {}) {
  if (!payload.userid) throw new Error('userid required');
  const body = {
    userid: payload.userid,
    moduleid: payload.moduleid ?? null,
    menuid: payload.menuid ?? null,
    canview: !!payload.canview,
    canedit: !!payload.canedit,
    candelete: !!payload.candelete,
    cancreate: !!payload.cancreate,
  };
  return UserPermission.create(body);
}

export async function updateUserPermission(id, payload = {}) {
  const rec = await UserPermission.findByPk(id);
  if (!rec) return null;
  const updates = {};
  ['moduleid', 'menuid', 'canview', 'canedit', 'candelete', 'cancreate'].forEach((k) => {
    if (payload[k] !== undefined) updates[k] = typeof rec[k] === 'boolean' ? !!payload[k] : payload[k];
  });
  await rec.update(updates);
  return rec;
}

export async function deleteUserPermission(id) {
  return UserPermission.destroy({ where: { permitid: id } });
}

export async function listUsers() {
  return User.findAll({ attributes: { exclude: ['usrpassword'] }, order: [['id', 'ASC']] });
}

export async function getUser(id) {
  return User.findByPk(id, { attributes: { exclude: ['usrpassword'] } });
}

export async function createUser(payload = {}) {
  const { userid, password, usrpassword, usercode, first_name, last_name, usertype = 'user', instituteid, email } = payload;
  const pw = password || usrpassword;
  if (!userid || !pw) throw new Error('userid and password required');
  const hashed = await bcrypt.hash(pw.toString(), 10);
  const user = await User.create({ userid: userid.toLowerCase(), usercode: usercode || null, first_name, last_name, usrpassword: hashed, usertype, instituteid: instituteid || null, email });
  const safe = { ...user.get() }; delete safe.usrpassword; return safe;
}

export async function updateUser(id, payload = {}) {
  const user = await User.findByPk(id);
  if (!user) return null;
  const allowed = ['userid','usercode','first_name','last_name','usertype','instituteid','email','phone','address','city','usrpic'];
  const updates = {};
  allowed.forEach((k) => { if (payload[k] !== undefined) updates[k] = payload[k]; });
  if (payload.password || payload.usrpassword) {
    updates.usrpassword = await bcrypt.hash((payload.password || payload.usrpassword).toString(), 10);
  }
  await user.update(updates);
  const safe = { ...user.get() }; delete safe.usrpassword; return safe;
}

export default {
  listModules,
  createModule,
  listMenus,
  createMenu,
  listMenusByModule,
  listNavigation,
  listUserPermissions,
  createUserPermission,
  updateUserPermission,
  deleteUserPermission,
  listUsers,
  getUser,
  createUser,
  updateUser,
};