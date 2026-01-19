// backend/models/index.mjs
import { sequelize } from '../db.mjs';

// Import models so they are registered on the sequelize instance
import '../models/user.mjs';         // your existing user model (must call define on sequelize)
import '../models/module.mjs';       // if present
import '../models/menu.mjs';         // if present
import '../models/userLog.mjs';

import { Institute } from '../models/institute.mjs';
import { Role } from '../models/role.mjs';
import { RoleAssignment } from '../models/roleAssignment.mjs';
import { Permission } from '../models/permission.mjs';
import { CourseMain } from '../models/course_main.mjs';
import { CourseSub } from '../models/course_sub.mjs';
import { UserProfile } from '../models/userProfile.mjs';
import { Verification } from './docrec/verification.mjs';
import { DocRec } from './docrec/doc_rec.mjs';
import { Migration as DocrecMigration } from './docrec/migration.mjs';
import { Provisional as DocrecProvisional } from './docrec/provisional.mjs';
import { InstVerificationMain } from './docrec/inst_verification_main.mjs';
import { InstVerificationStudent } from './docrec/inst_verification_student.mjs';
import { PayPrefixRule } from './docrec/pay_prefix_rule.mjs';
import { Degree } from '../models/degree.mjs';
import { Enrollment } from '../models/enrollment.mjs';
import { Eca } from './docrec/eca.mjs';
import { User } from '../models/user.mjs';
import { Setting } from './path.mjs';
import { ChatMessage } from './chat_message.mjs';
import { EmpProfile } from './emp_profile.mjs';
import { LeaveType } from './leave_type.mjs';
import { LeavePeriod } from './leave_period.mjs';
import { LeaveAllocation } from './leave_allocation.mjs';
import { LeaveEntry } from './leave_entry.mjs';

// Optionally define associations (if you want)
// ECA relations: Eca belongs to DocRec via doc_rec_id string key and User (creator)
if (Eca && DocRec) {
  Eca.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
  DocRec.hasMany(Eca, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'ecas' });
}
// DocRec -> child records
if (DocRec && Verification) {
  DocRec.hasOne(Verification, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'vr' });
  Verification.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
}
// MG/PR allow multiple entries per doc_rec_id (multiple cancelled, single pending/done) -> hasMany
if (DocRec && DocrecMigration) {
  DocRec.hasMany(DocrecMigration, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'mg_entries' });
  DocrecMigration.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
}
if (DocRec && DocrecProvisional) {
  DocRec.hasMany(DocrecProvisional, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'pr_entries' });
  DocrecProvisional.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
}
if (DocRec && InstVerificationMain) {
  DocRec.hasOne(InstVerificationMain, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'ivm' });
  InstVerificationMain.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
}
if (InstVerificationMain && InstVerificationStudent) {
  InstVerificationMain.hasMany(InstVerificationStudent, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'students' });
  InstVerificationStudent.belongsTo(InstVerificationMain, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'main' });
}
if (Eca && User) {
  Eca.belongsTo(User, { foreignKey: 'createdby', as: 'creator' });
  // optional reverse
  if (User.hasMany) {
    User.hasMany(Eca, { foreignKey: 'createdby', as: 'createdEcas' });
  }
}
const models = {
  sequelize,
  User,
  Institute,
  Role,
  RoleAssignment,
  Permission,
  CourseMain,
  CourseSub,
  UserProfile,
  Verification,
  DocRec,
  DocrecMigration,
  DocrecProvisional,
  InstVerificationMain,
  InstVerificationStudent,
  Degree,
  Enrollment,
  Eca,
  Setting,
  ChatMessage,
  EmpProfile,
  LeaveType,
  LeavePeriod,
  LeaveAllocation,
  LeaveEntry,
  PayPrefixRule,
};

export { sequelize };
export default models;
