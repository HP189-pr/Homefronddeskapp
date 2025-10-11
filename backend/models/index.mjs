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
import { Verification } from '../models/verification.mjs';
import { Degree } from '../models/degree.mjs';
import { Enrollment } from '../models/enrollment.mjs';
import { MigrationRequest } from '../models/migration_request.mjs';
import { ProvisionalRequest } from '../models/provisional_request.mjs';
import { InstitutionalVerification } from '../models/institutional_verification.mjs';
import { DocumentReceipt } from '../models/document_receipt.mjs';
import { Setting } from './path.mjs';
import { ChatMessage } from './chat_message.mjs';
import { EmpProfile } from './emp_profile.mjs';
import { LeaveType } from './leave_type.mjs';
import { LeavePeriod } from './leave_period.mjs';
import { LeaveAllocation } from './leave_allocation.mjs';
import { LeaveEntry } from './leave_entry.mjs';

// Optionally define associations (if you want)
const models = {
  sequelize,
  Institute,
  Role,
  RoleAssignment,
  Permission,
  CourseMain,
  CourseSub,
  UserProfile,
  Verification,
  Degree,
  Enrollment,
  MigrationRequest,
  ProvisionalRequest,
  InstitutionalVerification,
  DocumentReceipt,
  Setting,
  ChatMessage,
  EmpProfile,
  LeaveType,
  LeavePeriod,
  LeaveAllocation,
  LeaveEntry,
};

export { sequelize };
export default models;
