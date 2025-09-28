// backend/models/user.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userid: { type: DataTypes.STRING, allowNull: false, unique: true },    // login id (normalized)
  usercode: { type: DataTypes.STRING, allowNull: true },                 // alternate code
  first_name: { type: DataTypes.STRING, allowNull: true },
  last_name: { type: DataTypes.STRING, allowNull: true },
  usrpassword: { type: DataTypes.STRING, allowNull: false },            // hashed password
  usertype: { type: DataTypes.ENUM('admin','superuser','operator','user'), allowNull: false, defaultValue: 'user' },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  usrpic: { type: DataTypes.STRING, allowNull: true },
  instituteid: { type: DataTypes.INTEGER, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'users',
  timestamps: false,
});

// export default for convenience
export default User;
