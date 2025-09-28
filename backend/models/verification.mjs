// backend/models/verification.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Verification = sequelize.define('Verification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  verification_no: { type: DataTypes.STRING, allowNull: true, unique: true }, // e.g., 01-250001
  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },

  enrollment_no: { type: DataTypes.STRING, allowNull: true }, // references enrollments.enrollment_no (string to avoid FK headaches)
  studentname: { type: DataTypes.STRING, allowNull: true }, // denormalized for quick view

  // temporary year auto number coming from Document Receipt (e.g., vr20250070)
  vryearautonumber: { type: DataTypes.STRING, allowNull: true },

  no_of_transcript: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_marksheet_set: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_degree: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_moi: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_backlog: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },

  status: { type: DataTypes.ENUM('pending','in-progress','done','cancel'), allowNull: false, defaultValue: 'pending' },

  // If cancel -> verification_no may be null; if done -> must have verification_no (enforce at service/controller level)
  fees_rec_no: { type: DataTypes.STRING, allowNull: true },
  remark: { type: DataTypes.TEXT, allowNull: true },

  // auto-link to uploaded pdf based on final number & configured path
  doc_scan_copy: { type: DataTypes.STRING, allowNull: true }, // relative path or URL

  // ECA fields
  is_eca: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  eca_agency: { type: DataTypes.ENUM('WES','IQAS','ICES','ICAS','CES','ECE','PEBC', 'OTHER'), allowNull: true },
  eca_agency_other: { type: DataTypes.STRING, allowNull: true },

  mail_status: { type: DataTypes.STRING, allowNull: true },
  eca_mail_date: { type: DataTypes.DATEONLY, allowNull: true },
  eca_ref_no: { type: DataTypes.STRING, allowNull: true },
  eca_remark: { type: DataTypes.TEXT, allowNull: true },

  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'verifications',
  timestamps: false,
  indexes: [
    { fields: ['verification_no'], unique: true },
    { fields: ['enrollment_no'] },
    { fields: ['status'] },
    { fields: ['vryearautonumber'] },
  ],
});

export default Verification;
