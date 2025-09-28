import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const UserLog = sequelize.define('UserLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userid: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false },
  meta: { type: DataTypes.JSONB, allowNull: true },
  createdat: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  level: { type: DataTypes.STRING, allowNull: true, defaultValue: 'info' },
  ip: { type: DataTypes.STRING, allowNull: true },
  user_agent: { type: DataTypes.TEXT, allowNull: true },
  session_id: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'user_logs',
  timestamps: false,
});

export default UserLog;
