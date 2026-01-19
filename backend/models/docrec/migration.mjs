// backend/models/migration.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const Migration = sequelize.define('Migration', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  doc_rec_id: { type: DataTypes.STRING(20), allowNull: false },
  enrollment_no: { type: DataTypes.STRING(100), allowNull: true },
  student_name: { type: DataTypes.STRING(255), allowNull: true },

  institute_id: { type: DataTypes.BIGINT, allowNull: true },
  subcourse_id: { type: DataTypes.STRING(255), allowNull: true }, // string to match course_sub.subcourse_id
  maincourse_id: { type: DataTypes.STRING(255), allowNull: true }, // string to match course_main.maincourse_id

  mg_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  mg_date: { type: DataTypes.DATEONLY, allowNull: true },
  exam_year: { type: DataTypes.STRING(20), allowNull: true },
  admission_year: { type: DataTypes.STRING(20), allowNull: true },
  exam_details: { type: DataTypes.TEXT, allowNull: true },

  mg_status: { type: DataTypes.ENUM('Pending','Issued','Cancelled'), allowNull: false, defaultValue: 'Pending' },
  pay_rec_no: { type: DataTypes.STRING(50), allowNull: true },

  createdby: { type: DataTypes.BIGINT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'migration',
  timestamps: false,
  indexes: [
    { fields: ['doc_rec_id'], name: 'idx_mg_doc_rec' },
    { fields: ['enrollment_no'], name: 'idx_mg_enrollment' },
    { fields: ['institute_id'], name: 'idx_mg_institute' },
    { fields: ['mg_number'], name: 'idx_mg_number' }
  ]
});

export default Migration;
