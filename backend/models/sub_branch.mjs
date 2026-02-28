import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const SubBranch = sequelize.define('SubBranch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  subcourse_id: { type: DataTypes.STRING(255), allowNull: false },
  subcourse_name: { type: DataTypes.STRING(255), allowNull: true },
  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  maincourse_id: { type: DataTypes.STRING(255), allowNull: false },
  updatedby: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'sub_branch',
  timestamps: false,
});

export default SubBranch;