import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  enrollment_no: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  student_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  institute_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maincourse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subcourse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admission_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  temp_enroll_no: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdat: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  updatedat: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'enrollment',
  timestamps: false,
});
