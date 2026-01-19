// backend/models/provisional.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const Provisional = sequelize.define('Provisional', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  doc_rec_id: { type: DataTypes.STRING(20), allowNull: false },
  enrollment_no: { type: DataTypes.STRING(100), allowNull: true },
  student_name: { type: DataTypes.STRING(255), allowNull: true },

  institute_id: { type: DataTypes.BIGINT, allowNull: true },
  subcourse_id: { type: DataTypes.STRING(255), allowNull: true }, // string to match course_sub
  maincourse_id: { type: DataTypes.STRING(255), allowNull: true }, // string to match course_main

  class_obtain: { type: DataTypes.STRING(100), allowNull: true },
  // Optional degree name from external schema
  prv_degree_name: { type: DataTypes.STRING(255), allowNull: true },
  prv_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  prv_date: { type: DataTypes.DATEONLY, allowNull: true },
  passing_year: { type: DataTypes.STRING(20), allowNull: true },
  prv_status: { type: DataTypes.ENUM('Pending','Issued','Cancelled'), allowNull: false, defaultValue: 'Pending' },
  pay_rec_no: { type: DataTypes.STRING(50), allowNull: true },

  createdby: { type: DataTypes.BIGINT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'provisional',
  timestamps: false,
  indexes: [
    { fields: ['doc_rec_id'], name: 'idx_prv_doc_rec' },
    { fields: ['enrollment_no'], name: 'idx_prv_enrollment' },
    { fields: ['institute_id'], name: 'idx_prv_institute' },
    { fields: ['prv_number'], name: 'idx_prv_number' }
  ]
});

export default Provisional;
