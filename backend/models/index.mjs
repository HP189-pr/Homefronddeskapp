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
import { Verification } from './docrec/transcript.mjs';
import { DocRec } from './docrec/doc_rec.mjs';
import MigrationRequest from './docrec/migration.mjs';
import ProvisionalRequest from './docrec/provisional.mjs';
import { InstLetterMain, InstLetterStudent } from './docrec/instLetter.mjs';
import { PayPrefixRule } from './docrec/pay_prefix_rule.mjs';
import { Degree } from '../models/degree.mjs';
import { Enrollment } from '../models/enrollment.mjs';
import { Eca } from './docrec/eca.mjs';
import { User } from '../models/user.mjs';
import { Setting } from './path.mjs';
import { ChatMessage } from './chat_message.mjs';
import { EmpProfile } from './emp_profile.mjs';
import { LeaveType, LeavePeriod, LeaveAllocation, LeaveEntry } from './leave.mjs';
import { MainBranch } from './main_branch.mjs';
import { SubBranch } from './sub_branch.mjs';
import { InstituteCourseOffering } from './institute_course_offering.mjs';
import { StudentProfile } from './student_profile.mjs';
import { StudentDegree } from './student_degree.mjs';
import { AdmissionCancel } from './admission_cancel.mjs';
import { ConvocationMaster } from './convocation_master.mjs';
import { TranscriptRequest } from './transcript_request.mjs';

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
if (DocRec && MigrationRequest) {
  DocRec.hasMany(MigrationRequest, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'mg_entries' });
  MigrationRequest.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
}
if (DocRec && ProvisionalRequest) {
  DocRec.hasMany(ProvisionalRequest, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'pr_entries' });
  ProvisionalRequest.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
}
if (DocRec && InstLetterMain) {
  DocRec.hasOne(InstLetterMain, { foreignKey: 'doc_rec_id', sourceKey: 'doc_rec_id', as: 'inst_letter' });
  InstLetterMain.belongsTo(DocRec, { foreignKey: 'doc_rec_id', targetKey: 'doc_rec_id', as: 'docRec' });
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
  MigrationRequest,
  ProvisionalRequest,
  InstLetterMain,
  InstLetterStudent,
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
  MainBranch,
  SubBranch,
  InstituteCourseOffering,
  StudentProfile,
  StudentDegree,
  AdmissionCancel,
  ConvocationMaster,
  TranscriptRequest,
};

export { sequelize };
export default models;
