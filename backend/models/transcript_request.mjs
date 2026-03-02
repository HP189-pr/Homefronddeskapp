import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.mjs';

export class TranscriptRequest extends Model {
  static STATUS_PENDING = 'pending';

  static STATUS_PROGRESS = 'progress';

  static STATUS_CANCEL = 'cancel';

  static STATUS_DONE = 'done';

  static normalizeStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return TranscriptRequest.STATUS_PENDING;
    if (['done', 'sent', 'completed', 'complete'].includes(raw)) return TranscriptRequest.STATUS_DONE;
    if (['progress', 'in progress', 'in_progress', 'processing'].includes(raw)) return TranscriptRequest.STATUS_PROGRESS;
    if (['cancel', 'cancelled', 'canceled'].includes(raw)) return TranscriptRequest.STATUS_CANCEL;
    if (['pending', 'hold'].includes(raw)) return TranscriptRequest.STATUS_PENDING;
    return raw;
  }
}

TranscriptRequest.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'trn_reqest_date',
    },
    request_ref_no: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'trn_reqest_ref_no',
    },
    enrollment_no: { type: DataTypes.STRING(64), allowNull: false },
    student_name: { type: DataTypes.STRING(255), allowNull: false },
    institute_name: { type: DataTypes.STRING(255), allowNull: false },
    transcript_receipt: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'trnscript_receipt',
    },
    transcript_remark: { type: DataTypes.TEXT, allowNull: true },
    submit_mail: { type: DataTypes.STRING(255), allowNull: true },
    pdf_generate: { type: DataTypes.STRING(64), allowNull: true },
    mail_status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: TranscriptRequest.STATUS_PENDING,
    },
    raw_row: { type: DataTypes.JSONB, allowNull: true },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    tr_request_no: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    search_vector: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'TranscriptRequest',
    tableName: 'transcript_request',
    timestamps: false,
    indexes: [
      { fields: ['created'], name: 'idx_tr_created' },
      { fields: ['enrollment_no'], name: 'idx_tr_enrollment' },
      { fields: ['tr_request_no'], name: 'idx_tr_req_no' },
    ],
  },
);

TranscriptRequest.beforeValidate((instance) => {
  instance.mail_status = TranscriptRequest.normalizeStatus(instance.mail_status);
});

export default TranscriptRequest;