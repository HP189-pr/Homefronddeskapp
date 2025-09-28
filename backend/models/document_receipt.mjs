// backend/models/document_receipt.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const DocumentReceipt = sequelize.define('DocumentReceipt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },
  enrollment_no: { type: DataTypes.STRING, allowNull: true },
  studentname: { type: DataTypes.STRING, allowNull: true },

  doc_type: {
    type: DataTypes.ENUM('verification','migration','provisional','institutional','gtm'),
    allowNull: false,
  },

  // temp year auto numbers by type (example vr20250070)
  vryearautonumber: { type: DataTypes.STRING, allowNull: true },
  mgyearautonumber: { type: DataTypes.STRING, allowNull: true },
  pryearautonumber: { type: DataTypes.STRING, allowNull: true },
  ivyearautonumber: { type: DataTypes.STRING, allowNull: true },
  gtmyearautonumber: { type: DataTypes.STRING, allowNull: true },

  // Verification counts
  no_of_transcript: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_marksheet_set: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_degree: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_moi: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  no_of_backlog: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },

  // Migration payment receipt
  mgrec_no: { type: DataTypes.STRING, allowNull: true },
  // Provisional payment receipt
  prrec_no: { type: DataTypes.STRING, allowNull: true },
  // Institutional payment receipt
  ivrec_no: { type: DataTypes.STRING, allowNull: true },

  // Institutional contact details
  institution_name: { type: DataTypes.STRING, allowNull: true },
  address1: { type: DataTypes.STRING, allowNull: true },
  address2: { type: DataTypes.STRING, allowNull: true },
  address3: { type: DataTypes.STRING, allowNull: true },
  city: { type: DataTypes.STRING, allowNull: true },
  pincode: { type: DataTypes.STRING, allowNull: true },
  mobile: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },

  // ECA at receipt stage (for verification type)
  is_eca: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  eca_agency: { type: DataTypes.ENUM('WES','IQAS','ICES','ICAS','CES','ECE','PEBC', 'OTHER'), allowNull: true },
  eca_agency_other: { type: DataTypes.STRING, allowNull: true },
  eca_remark: { type: DataTypes.TEXT, allowNull: true },

  // Simple status for tracking at receipt stage
  status: { type: DataTypes.ENUM('received','in-progress','done','cancel'), allowNull: false, defaultValue: 'received' },

  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'document_receipts',
  timestamps: false,
  indexes: [
    { fields: ['doc_type'] },
    { fields: ['enrollment_no'] },
    { fields: ['vryearautonumber'] },
    { fields: ['mgyearautonumber'] },
    { fields: ['pryearautonumber'] },
    { fields: ['ivyearautonumber'] },
    { fields: ['gtmyearautonumber'] },
    { fields: ['status'] },
  ],
});

export default DocumentReceipt;
