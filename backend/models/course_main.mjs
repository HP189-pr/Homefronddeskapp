import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const CourseMain = sequelize.define('CourseMain', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  maincourse_id: { type: DataTypes.INTEGER, allowNull: true },
  course_code: { type: DataTypes.STRING, allowNull: true },
  course_name: { type: DataTypes.STRING, allowNull: true },
  createdat: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
}, {
  tableName: 'course_main',
  timestamps: false,
});
