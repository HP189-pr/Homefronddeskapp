// backend/models/menu.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';
import './module.mjs'; // ensure Module is registered (safe even if already imported elsewhere)

export const Menu = sequelize.define('Menu', {
  menuid: { type: DataTypes.INTEGER, primaryKey: true }, // your DB uses specific ids sometimes
  moduleid: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: true }, // optional canonical id
  parentmenuid: { type: DataTypes.INTEGER, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedby: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'menus',
  timestamps: false,
});

// Optional association helper (not required)
Menu.associate = (_models) => {
  // if using associations:
  // Menu.belongsTo(models.Module, { foreignKey: 'moduleid' });
};

export default Menu;
