// backend/routes/adminRoutes.mjs
import express from 'express';
import { Institute } from '../models/institute.mjs';
import { User } from '../models/user.mjs'; // must exist
import { Role } from '../models/role.mjs';
import { RoleAssignment } from '../models/roleAssignment.mjs';
import { Permission } from '../models/permission.mjs';
import bcrypt from 'bcrypt';
import { UserLog } from '../models/userLog.mjs';
import { CourseMain } from '../models/course_main.mjs';
import { CourseSub } from '../models/course_sub.mjs';
import rightsController from '../controllers/rightsController.mjs';
import { UserProfile } from '../models/userProfile.mjs';
import { Setting } from '../models/setting.mjs';

const router = express.Router();

/* Institutes */
router.get('/institutes', async (req, res, next) => {
  try {
    const list = await Institute.findAll({ order: [['institute_id', 'ASC']] });
    res.json({ institutes: list });
  } catch (e) {
    next(e);
  }
});
router.post('/institutes', async (req, res, next) => {
  try {
    const {
      institute_id: bodyInstituteId,
      institute_code,
      institute_name,
      institute_campus,
      institute_address,
      institute_city,
    } = req.body || {};

    if (!institute_name || typeof institute_name !== 'string') {
      return res.status(400).json({ error: 'Missing institute_name' });
    }

    // institute_id is required by model; generate next if not provided
    let institute_id = bodyInstituteId;
    if (!Number.isInteger(institute_id)) {
      const max = await Institute.max('institute_id');
      institute_id = Number.isFinite(max) ? max + 1 : 1;
    }

    const rec = await Institute.create({
      institute_id,
      institute_code: institute_code || null,
      institute_name,
      institute_campus: institute_campus || null,
      institute_address: institute_address || null,
      institute_city: institute_city || null,
    });
    res.json(rec);
  } catch (e) {
    next(e);
  }
});
// Update institute by primary key id
router.patch('/institutes/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const inst = await Institute.findByPk(id);
    if (!inst) return res.status(404).json({ error: 'Institute not found' });

    const allowed = [
      'institute_id',
      'institute_code',
      'institute_name',
      'institute_campus',
      'institute_address',
      'institute_city',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];

    await inst.update(payload);
    res.json(inst);
  } catch (e) {
    next(e);
  }
});

/* Users */
router.get('/users', async (req, res, next) => {
  try { const users = await User.findAll({ attributes: { exclude: ['usrpassword'] }, order: [['id','ASC']] }); res.json({ users }); } catch (e) { next(e); }
});
router.post('/users', async (req, res, next) => {
  try {
    const { userid, usercode, first_name, last_name, usrpassword, usertype = 'user', instituteid, email } = req.body;
    if (!userid || !usrpassword) return res.status(400).json({ error: 'Missing userid or password' });
    const hashed = await bcrypt.hash(usrpassword, 10);
    const user = await User.create({
      userid: userid.toLowerCase(),
      usercode: usercode ? usercode.toLowerCase() : null,
      first_name, last_name, usrpassword: hashed, usertype, instituteid: instituteid || null, email,
    });
    const safe = { ...user.get() }; delete safe.usrpassword;
    // log creation
    try {
      await UserLog.create({ userid: user.id, action: 'create', meta: { by: req.user ? req.user.id : null }, ip: req.ip, user_agent: req.get('user-agent'), session_id: req.session?.id || null, level: 'info' });
    } catch (e) { /* ignore log errors to avoid blocking create */ }
    res.json(safe);
  } catch (e) { console.error('adminRoutes POST /users error:', e && e.errors ? e.errors : e); next(e); }
});

// Update user (including password change)
router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const allowed = ['userid','usercode','first_name','last_name','usertype','instituteid','email','phone','address','city','usrpic'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // password change
    if (req.body.usrpassword) {
      const hashed = await bcrypt.hash(req.body.usrpassword, 10);
      payload.usrpassword = hashed;
    }

    await user.update(payload);
    const safe = { ...user.get() }; delete safe.usrpassword;
    try {
      await UserLog.create({ userid: user.id, action: 'update', meta: { by: req.user ? req.user.id : null }, ip: req.ip, user_agent: req.get('user-agent'), session_id: req.session?.id || null, level: 'info' });
  } catch (e) { /* ignore log errors to avoid blocking update */ }
    res.json(safe);
  } catch (e) { next(e); }
});

// User logs
router.get('/users/:id/logs', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id,10);
    const logs = await UserLog.findAll({ where: { userid: id }, order: [['createdat','DESC']], limit: 200 });
    res.json({ logs });
  } catch (e) { next(e); }
});

/* Roles */
router.get('/roles', async (req, res, next) => {
  try { const roles = await Role.findAll({ order: [['roleid','ASC']] }); res.json({ roles }); } catch (e) { next(e); }
});
router.post('/roles', async (req, res, next) => {
  try { const r = await Role.create(req.body); res.json(r); } catch (e) { next(e); }
});
router.post('/roles/assign', async (req, res, next) => {
  try {
    const { userid, roleid } = req.body;
    if (!userid || !roleid) return res.status(400).json({ error: 'Missing' });
    const rec = await RoleAssignment.create({ userid, roleid });
    res.json(rec);
  } catch (e) { next(e); }
});
// List role assignments
router.get('/roles/assignments', async (req, res, next) => {
  try {
    const list = await RoleAssignment.findAll({ order: [['id', 'ASC']] });
    res.json({ assignments: list });
  } catch (e) { next(e); }
});
// Delete assignment
router.delete('/roles/assign/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await RoleAssignment.destroy({ where: { id } });
    res.json({ ok: rows > 0 });
  } catch (e) { next(e); }
});

/* Permissions */
router.get('/permissions', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.roleid) where.roleid = parseInt(req.query.roleid,10);
    if (req.query.moduleid) where.moduleid = parseInt(req.query.moduleid,10);
    if (req.query.menuid) where.menuid = parseInt(req.query.menuid,10);
    if (req.query.instituteid) where.instituteid = parseInt(req.query.instituteid,10);
    const perms = await Permission.findAll({ where });
    res.json({ permissions: perms });
  } catch (e) { next(e); }
});
router.post('/permissions', async (req, res, next) => {
  try {
    const { roleid, moduleid = null, menuid = null, action = null, instituteid = null } = req.body;
    if (!roleid) return res.status(400).json({ error: 'Missing roleid' });
    const rec = await Permission.create({ roleid, moduleid: moduleid || null, menuid: menuid || null, action: action || null, instituteid: instituteid || null });
    res.json(rec);
  } catch (e) { next(e); }
});
router.delete('/permissions/:id', async (req, res, next) => {
  try { const id = parseInt(req.params.id,10); const rows = await Permission.destroy({ where: { permissionid: id } }); res.json({ ok: rows > 0 }); } catch (e) { next(e); }
});

/* User Profiles */
router.get('/userprofiles', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.userid) where.userid = parseInt(req.query.userid, 10);
    const profiles = await UserProfile.findAll({ where, order: [['id','ASC']] });
    res.json({ profiles });
  } catch (e) { next(e); }
});
router.post('/userprofiles', async (req, res, next) => {
  try {
    const {
      userid,
      profile_pic,
      first_name,
      middle_name,
      last_name,
      email,
      phone,
      actual_joining_date,
      institute_joining_date,
    } = req.body || {};
    if (!userid) return res.status(400).json({ error: 'Missing userid' });
    const rec = await UserProfile.create({
      userid,
      profile_pic: profile_pic || null,
      first_name: first_name || null,
      middle_name: middle_name || null,
      last_name: last_name || null,
      email: email || null,
      phone: phone || null,
      actual_joining_date: actual_joining_date || null,
      institute_joining_date: institute_joining_date || null,
    });
    res.json(rec);
  } catch (e) { next(e); }
});
router.patch('/userprofiles/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await UserProfile.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const allowed = ['profile_pic','first_name','middle_name','last_name','email','phone','actual_joining_date','institute_joining_date'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    await row.update(payload);
    res.json(row);
  } catch (e) { next(e); }
});

/* Unified rights routes (namespaced) */
router.get('/rights/roles', rightsController.listRoles);
router.post('/rights/roles', rightsController.createRole);
router.patch('/rights/roles/:roleid', rightsController.updateRole);
router.delete('/rights/roles/:roleid', rightsController.deleteRole);

router.get('/rights/permissions', rightsController.listPermissions);
router.post('/rights/permissions', rightsController.createPermission);
router.delete('/rights/permissions/:id', rightsController.deletePermission);

router.get('/rights/assignments', rightsController.listAssignments);
router.post('/rights/assignments', rightsController.createAssignment);
router.delete('/rights/assignments/:id', rightsController.deleteAssignment);

router.get('/rights/modules', rightsController.listModules);
router.get('/rights/menus', rightsController.listMenus);
// --- Course masters ---
router.get('/course_main', async (req, res, next) => {
  try {
    const list = await CourseMain.findAll({ order: [['maincourse_id', 'ASC']] });
    res.json({ course_main: list });
  } catch (e) { next(e); }
});
router.post('/course_main', async (req, res, next) => {
  try {
    const { maincourse_id: bodyId, course_code, course_name } = req.body || {};
    if (!course_name && !course_code) return res.status(400).json({ error: 'Provide course_name or course_code' });
    let maincourse_id = bodyId;
    if (!Number.isInteger(maincourse_id)) {
      const max = await CourseMain.max('maincourse_id');
      maincourse_id = Number.isFinite(max) ? max + 1 : 1;
    }
    const rec = await CourseMain.create({ maincourse_id, course_code: course_code || null, course_name: course_name || null });
    res.json(rec);
  } catch (e) { next(e); }
});
router.patch('/course_main/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await CourseMain.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const allowed = ['maincourse_id','course_code','course_name'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    await row.update(payload);
    res.json(row);
  } catch (e) { next(e); }
});

router.get('/course_sub', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.maincourse_id) where.maincourse_id = parseInt(req.query.maincourse_id,10);
    const list = await CourseSub.findAll({ where, order: [['subcourse_id', 'ASC']] });
    res.json({ course_sub: list });
  } catch (e) { next(e); }
});
router.post('/course_sub', async (req, res, next) => {
  try {
    const { subcourse_id: bodyId, subcourse_name, maincourse_id } = req.body || {};
    if (!subcourse_name) return res.status(400).json({ error: 'Missing subcourse_name' });
    let subcourse_id = bodyId;
    if (!Number.isInteger(subcourse_id)) {
      const max = await CourseSub.max('subcourse_id');
      subcourse_id = Number.isFinite(max) ? max + 1 : 1;
    }
    const rec = await CourseSub.create({ subcourse_id, subcourse_name, maincourse_id: maincourse_id || null });
    res.json(rec);
  } catch (e) { next(e); }
});
router.patch('/course_sub/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await CourseSub.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const allowed = ['subcourse_id','subcourse_name','maincourse_id'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    await row.update(payload);
    res.json(row);
  } catch (e) { next(e); }
});

/* System Settings (key-value) */
// List first 200 settings (to keep payload small)
router.get('/settings', async (req, res, next) => {
  try {
    const list = await Setting.findAll({ order: [['key','ASC']], limit: 200 });
    res.json({ settings: list });
  } catch (e) { next(e); }
});

// Get one setting by key
router.get('/settings/:key', async (req, res, next) => {
  try {
    const row = await Setting.findByPk(req.params.key);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// Upsert setting
router.put('/settings/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    const value = req.body?.value ?? null;
    const [row, created] = await Setting.upsert({ key, value, updatedat: new Date() }, { returning: true });
    // Sequelize upsert returns [instance, created] for postgres
    res.json(row);
  } catch (e) { next(e); }
});

// Delete setting
router.delete('/settings/:key', async (req, res, next) => {
  try {
    const rows = await Setting.destroy({ where: { key: req.params.key } });
    res.json({ ok: rows > 0 });
  } catch (e) { next(e); }
});
export default router;
