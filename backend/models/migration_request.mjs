// backend/models/migration_request.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const MigrationRequest = sequelize.define('MigrationRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },
  enrollment_no: { type: DataTypes.STRING, allowNull: true },
  pryearautonumber: { type: DataTypes.STRING, allowNull: true }, // yearly auto number ref
  studentname: { type: DataTypes.STRING, allowNull: true },
  migration_number: { type: DataTypes.STRING, allowNull: true }, // final number when done
  status: { type: DataTypes.ENUM('pending','done','cancel','correction'), allowNull: false, defaultValue: 'pending' },
  migration_scan_copy: { type: DataTypes.STRING, allowNull: true }, // pdf link/path
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'migration_requests',
  timestamps: false,
  indexes: [
    { fields: ['enrollment_no'] },
    { fields: ['migration_number'], unique: false },
    { fields: ['status'] },
  ],
});

export default MigrationRequest;
