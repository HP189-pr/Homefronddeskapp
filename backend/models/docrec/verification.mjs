// backend/models/verification.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const Verification = sequelize.define('Verification', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  // Align with external schema naming: expose as `enrollment_no` while keeping DB column `enrollment_id`
  enrollment_no: { type: DataTypes.STRING(100), allowNull: false, field: 'enrollment_id' },
  second_enrollment_id: { type: DataTypes.STRING(100), allowNull: true },

  student_name: { type: DataTypes.STRING(255), allowNull: false },

  // Keep DB column names the same but align property names if needed in services via mapping
  no_of_transcript: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  no_of_marksheet: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  no_of_degree: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  no_of_moi: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  no_of_backlog: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },

  pay_rec_no: { type: DataTypes.STRING(100), allowNull: true },

  status: { type: DataTypes.ENUM('IN_PROGRESS','PENDING','CORRECTION','CANCEL','DONE'), allowNull: false, defaultValue: 'IN_PROGRESS' },

  final_no: { type: DataTypes.STRING(50), allowNull: true, unique: true },

  mail_send_status: { type: DataTypes.ENUM('NOT_SENT','SENT','FAILED'), allowNull: false, defaultValue: 'NOT_SENT' },

  eca_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  eca_name: { type: DataTypes.STRING(255), allowNull: true },
  eca_ref_no: { type: DataTypes.STRING(100), allowNull: true },
  eca_submit_date: { type: DataTypes.DATEONLY, allowNull: true },
  eca_status: { type: DataTypes.ENUM('NOT_SENT','SENT','FAILED'), allowNull: false, defaultValue: 'NOT_SENT' },
  eca_resend_count: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  eca_last_action_at: { type: DataTypes.DATE, allowNull: true },
  eca_last_to_email: { type: DataTypes.STRING(255), allowNull: true },
  eca_history: { type: DataTypes.JSONB, allowNull: true },

  replaces_verification_id: { type: DataTypes.BIGINT, allowNull: true },

  vr_remark: { type: DataTypes.TEXT, allowNull: true },
  vr_done_date: { type: DataTypes.DATEONLY, allowNull: true },

  doc_rec_id: { type: DataTypes.STRING(20), allowNull: true },

  last_resubmit_date: { type: DataTypes.DATEONLY, allowNull: true },
  last_resubmit_status: { type: DataTypes.STRING(20), allowNull: true },

  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

  updatedby: { type: DataTypes.BIGINT, allowNull: true },
}, {
  tableName: 'verification',
  timestamps: false,
  indexes: [
    // Index still refers to the underlying DB column name
    { fields: ['enrollment_id'], name: 'idx_verification_enrollment' },
    { fields: ['second_enrollment_id'], name: 'idx_verif_sec_enroll' },
    { fields: ['status'], name: 'idx_verification_status' },
    { fields: ['final_no'], name: 'idx_verification_final_no' },
    { fields: ['pay_rec_no'], name: 'idx_verification_pay_rec_no' },
    { fields: ['doc_rec_id'], name: 'idx_verification_doc_rec' }
  ]
});

export default Verification;
