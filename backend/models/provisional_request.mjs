// backend/models/provisional_request.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const ProvisionalRequest = sequelize.define('ProvisionalRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },
  pryearautonumber: { type: DataTypes.STRING, allowNull: true },
  enrollment_no: { type: DataTypes.STRING, allowNull: true },
  studentname: { type: DataTypes.STRING, allowNull: true },
  provisional_number: { type: DataTypes.STRING, allowNull: true }, // e.g., 03-250001
  status: { type: DataTypes.ENUM('pending','done','cancel','correction'), allowNull: false, defaultValue: 'pending' },
  provisional_scan_copy: { type: DataTypes.STRING, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'provisional_requests',
  timestamps: false,
  indexes: [
    { fields: ['provisional_number'] },
    { fields: ['enrollment_no'] },
    { fields: ['status'] },
  ],
});

export default ProvisionalRequest;
