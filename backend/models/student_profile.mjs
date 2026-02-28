import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const StudentProfile = sequelize.define('StudentProfile', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  gender: { type: DataTypes.STRING(20), allowNull: true },
  birth_date: { type: DataTypes.DATEONLY, allowNull: true },
  address1: { type: DataTypes.STRING(255), allowNull: true },
  address2: { type: DataTypes.STRING(255), allowNull: true },
  city1: { type: DataTypes.STRING(100), allowNull: true },
  city2: { type: DataTypes.STRING(100), allowNull: true },
  contact_no: { type: DataTypes.STRING(50), allowNull: true },
  email: { type: DataTypes.STRING(254), allowNull: true },
  fees: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  hostel_required: { type: DataTypes.BOOLEAN, allowNull: true },
  aadhar_no: { type: DataTypes.STRING(20), allowNull: true },
  abc_id: { type: DataTypes.STRING(50), allowNull: true },
  mobile_adhar: { type: DataTypes.STRING(20), allowNull: true },
  name_adhar: { type: DataTypes.STRING(255), allowNull: true },
  mother_name: { type: DataTypes.STRING(255), allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: true },
  photo_uploaded: { type: DataTypes.BOOLEAN, allowNull: true },
  is_d2d: { type: DataTypes.BOOLEAN, allowNull: true },
  program_medium: { type: DataTypes.STRING(50), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  enrollment_no: { type: DataTypes.STRING(50), allowNull: true },
  updated_by: { type: DataTypes.INTEGER, allowNull: true },
  temp_enroll_no: { type: DataTypes.STRING(50), allowNull: true },
}, {
  tableName: 'student_profile',
  timestamps: false,
});

export default StudentProfile;