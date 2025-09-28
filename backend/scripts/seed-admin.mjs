// backend/scripts/seed-admin.mjs
import bcrypt from 'bcrypt';
import { sequelize } from '../db.mjs';
import { Role } from '../models/role.mjs';
import { User } from '../models/user.mjs';
import { RoleAssignment } from '../models/roleAssignment.mjs';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const [adminRole] = await Role.findOrCreate({ where: { name: 'admin-role' }, defaults: { description: 'Full admin role' } });

    const ADMIN_PW = process.env.ADMIN_PW || 'ChangeMe123!';
    const hash = await bcrypt.hash(ADMIN_PW, 10);

    const [adminUser] = await User.findOrCreate({
      where: { userid: 'admin' },
      defaults: { userid: 'admin', usercode: 'admin', first_name: 'Admin', last_name: 'User', usrpassword: hash, usertype: 'admin' },
    });

    await RoleAssignment.findOrCreate({ where: { userid: adminUser.id, roleid: adminRole.roleid } });

    console.log('Admin created:', adminUser.userid, 'password:', process.env.ADMIN_PW ? '[from env]' : ADMIN_PW);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
