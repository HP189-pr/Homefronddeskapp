// backend/models/user.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

// Maps to Django's auth_user table while keeping legacy attribute names used in routes/services.
// Column mapping keeps login/user code intact and derives a simple usertype for token payloads.
export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Username/login id (auth_user.username)
  userid: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'username' },

  // Optional alternate code (auth_user.usercode)
  usercode: { type: DataTypes.STRING, allowNull: true, field: 'usercode' },

  first_name: { type: DataTypes.STRING, allowNull: true, field: 'first_name' },
  last_name: { type: DataTypes.STRING, allowNull: true, field: 'last_name' },
  email: { type: DataTypes.STRING, allowNull: true, field: 'email' },

  // Django-stored password hash (auth_user.password)
  usrpassword: { type: DataTypes.STRING, allowNull: false, field: 'password' },

  is_superuser: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_superuser' },
  is_staff: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_staff' },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  last_login: { type: DataTypes.DATE, allowNull: true, field: 'last_login' },
  date_joined: { type: DataTypes.DATE, allowNull: true, field: 'date_joined' },

  // Derived/legacy fields for downstream compatibility
  usertype: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.getDataValue('is_superuser')) return 'admin';
      if (this.getDataValue('is_staff')) return 'staff';
      return 'user';
    },
    set(value) {
      const val = (value || '').toString().toLowerCase();
      if (val === 'admin' || val === 'superuser') {
        this.setDataValue('is_superuser', true);
        this.setDataValue('is_staff', true);
      } else if (val === 'staff' || val === 'operator') {
        this.setDataValue('is_staff', true);
      }
    },
  },
  createdat: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('date_joined');
    },
  },
  updatedat: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('last_login');
    },
  },
}, {
  tableName: 'auth_user',
  timestamps: false,
});

export default User;
