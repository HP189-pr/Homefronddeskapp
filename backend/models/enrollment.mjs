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
    allowNull: false,
  },
  student_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  institute_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  maincourse_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subcourse_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  batch: {
    type: DataTypes.INTEGER,
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
