import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const TranscriptRequest = sequelize.define('TranscriptRequest', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  trn_reqest_date: { type: DataTypes.DATE, allowNull: false },
  trn_reqest_ref_no: { type: DataTypes.STRING(128), allowNull: true },
  enrollment_no: { type: DataTypes.STRING(64), allowNull: false },
  student_name: { type: DataTypes.STRING(255), allowNull: false },
  institute_name: { type: DataTypes.STRING(255), allowNull: false },
  trnscript_receipt: { type: DataTypes.STRING(255), allowNull: true },
  transcript_remark: { type: DataTypes.TEXT, allowNull: true },
  submit_mail: { type: DataTypes.STRING(255), allowNull: true },
  pdf_generate: { type: DataTypes.STRING(64), allowNull: true },
  mail_status: { type: DataTypes.STRING(32), allowNull: true },
  raw_row: { type: DataTypes.JSONB, allowNull: true },
  created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  tr_request_no: { type: DataTypes.BIGINT, allowNull: false },
  search_vector: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'transcript_request',
  timestamps: false,
});

export default TranscriptRequest;