// backend/models/userProfile.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

// Mirrors the existing user_profiles table columns. The primary key is profileid.
// The user foreign key lives in column "id" (not "userid").
export const UserProfile = sequelize.define('UserProfile', {
  profileid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'id' },
  phone: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  state: { type: DataTypes.STRING, allowNull: true },
  country: { type: DataTypes.STRING, allowNull: true },
  profile_pic: { type: DataTypes.STRING, allowNull: true, field: 'profile_picture' },
  bio: { type: DataTypes.TEXT, allowNull: true },
  social_links: { type: DataTypes.JSONB, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'user_profiles',
  timestamps: false,
});

export default UserProfile;