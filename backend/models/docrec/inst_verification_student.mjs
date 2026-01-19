// backend/models/inst_verification_student.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const InstVerificationStudent = sequelize.define('InstVerificationStudent', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  doc_rec_id: { type: DataTypes.STRING(20), allowNull: true },
  sr_no: { type: DataTypes.INTEGER, allowNull: true },
  enrollment_no: { type: DataTypes.STRING(100), allowNull: true },
  // Optional extended fields present in external schema
  enrollment_no_text: { type: DataTypes.STRING(100), allowNull: true },
  student_name: { type: DataTypes.STRING(255), allowNull: true },
  institute_id: { type: DataTypes.BIGINT, allowNull: true },
  sub_course: { type: DataTypes.BIGINT, allowNull: true }, // FK to course_sub.subcourse_id (if numeric) — adapt as needed
  main_course: { type: DataTypes.BIGINT, allowNull: true }, // FK to course_main.maincourse_id
  type_of_credential: { type: DataTypes.STRING(50), allowNull: true },
  month_year: { type: DataTypes.STRING(20), allowNull: true },
  verification_status: { type: DataTypes.ENUM('IN_PROGRESS','PENDING','CORRECTION','CANCEL','DONE'), allowNull: true },
  iv_degree_name: { type: DataTypes.STRING(255), allowNull: true },

}, {
  tableName: 'inst_verification_student',
  timestamps: false,
  indexes: [
    { fields: ['doc_rec_id'], name: 'idx_ivs_doc_rec' },
    { fields: ['enrollment_no'], name: 'idx_ivs_enrollment' },
    { fields: ['institute_id'], name: 'idx_ivs_institute' }
  ]
});

export default InstVerificationStudent;
