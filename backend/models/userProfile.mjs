// backend/models/userProfile.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const UserProfile = sequelize.define('UserProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userid: { type: DataTypes.INTEGER, allowNull: false }, // FK to users.id
  profile_pic: { type: DataTypes.STRING, allowNull: true },
  first_name: { type: DataTypes.STRING, allowNull: true },
  middle_name: { type: DataTypes.STRING, allowNull: true },
  last_name: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  actual_joining_date: { type: DataTypes.DATEONLY, allowNull: true },
  institute_joining_date: { type: DataTypes.DATEONLY, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'user_profiles',
  timestamps: false,
});

export default UserProfile;