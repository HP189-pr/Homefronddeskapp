// backend/models/institutional_verification.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const InstitutionalVerification = sequelize.define('InstitutionalVerification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },
  ivyearautonumber: { type: DataTypes.STRING, allowNull: true },

  institution_name: { type: DataTypes.STRING, allowNull: true },
  address1: { type: DataTypes.STRING, allowNull: true },
  address2: { type: DataTypes.STRING, allowNull: true },
  address3: { type: DataTypes.STRING, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  pincode: { type: DataTypes.STRING, allowNull: true },
  mobile: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },

  status: { type: DataTypes.ENUM('pending','done','cancel','correction','fake'), allowNull: false, defaultValue: 'pending' },
  institutional_verification_number: { type: DataTypes.STRING, allowNull: true }, // e.g., 02-250001

  mail_or_post: { type: DataTypes.ENUM('mail','post'), allowNull: true },
  mail_or_post_date: { type: DataTypes.DATEONLY, allowNull: true },
  payment_receipt_no: { type: DataTypes.STRING, allowNull: true }, // prrec_no

  enrollment_no: { type: DataTypes.STRING, allowNull: true },
  studentname: { type: DataTypes.STRING, allowNull: true },

  iv_scan_copy: { type: DataTypes.STRING, allowNull: true },

  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'institutional_verifications',
  timestamps: false,
  indexes: [
    { fields: ['institutional_verification_number'] },
    { fields: ['ivyearautonumber'] },
    { fields: ['status'] },
    { fields: ['enrollment_no'] },
  ],
});

export default InstitutionalVerification;
