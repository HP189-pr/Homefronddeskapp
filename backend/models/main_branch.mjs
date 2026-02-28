import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const MainBranch = sequelize.define('MainBranch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  maincourse_id: { type: DataTypes.STRING(255), allowNull: false },
  course_name: { type: DataTypes.STRING(255), allowNull: true },
  course_code: { type: DataTypes.STRING(50), allowNull: true },
  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedby: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'main_branch',
  timestamps: false,
});

export default MainBranch;