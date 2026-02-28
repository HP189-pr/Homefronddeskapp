import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const AdmissionCancel = sequelize.define('AdmissionCancel', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cancel_date: { type: DataTypes.DATEONLY, allowNull: false },
  student_name: { type: DataTypes.STRING(100), allowNull: false },
  inward_no: { type: DataTypes.STRING(50), allowNull: true },
  inward_date: { type: DataTypes.DATEONLY, allowNull: true },
  outward_no: { type: DataTypes.STRING(50), allowNull: true },
  outward_date: { type: DataTypes.DATEONLY, allowNull: true },
  can_remark: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  enrollment_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'admission_cancel',
  timestamps: false,
});

export default AdmissionCancel;