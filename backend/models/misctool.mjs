import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

// 🔹 Holidays Model
const Holiday = sequelize.define(
  'Holiday',
  {
    hdid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    holiday_date: { type: DataTypes.DATE, allowNull: false },
    holiday_name: { type: DataTypes.STRING, allowNull: false },
    holiday_day: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'holiday', timestamps: false },
);

// 🔹 Birthdays Model
const Birthday = sequelize.define(
  'Birthday',
  {
    birthdateid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empname: { type: DataTypes.STRING, allowNull: false },
    emp_des: { type: DataTypes.STRING, allowNull: false },
    emp_insti: { type: DataTypes.STRING, allowNull: false },
    emp_City: { type: DataTypes.STRING, allowNull: false },
    emp_pin: { type: DataTypes.STRING, allowNull: false },
    birth_date: { type: DataTypes.DATE, allowNull: false },
    authsign: { type: DataTypes.STRING, allowNull: true },
    auth_name: { type: DataTypes.STRING, allowNull: true },
    auth_des: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: 'birthday', timestamps: false },
);

export { Holiday, Birthday };
