import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const InstituteCourseOffering = sequelize.define('InstituteCourseOffering', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campus: { type: DataTypes.STRING(255), allowNull: true },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  institute_id: { type: DataTypes.INTEGER, allowNull: false },
  updatedby: { type: DataTypes.INTEGER, allowNull: true },
  maincourse_id: { type: DataTypes.STRING(255), allowNull: false },
  subcourse_id: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'institute_course_offering',
  timestamps: false,
});

export default InstituteCourseOffering;