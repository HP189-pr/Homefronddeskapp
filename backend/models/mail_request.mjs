import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.mjs';
import { Enrollment } from './enrollment.mjs';

export class GoogleFormSubmission extends Model {
  static MAIL_STATUS_PENDING = 'pending';

  static MAIL_STATUS_PROGRESS = 'progress';

  static MAIL_STATUS_CANCEL = 'cancel';

  static MAIL_STATUS_DONE = 'done';

  static normalizeStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return GoogleFormSubmission.MAIL_STATUS_PENDING;
    if (['done', 'sent', 'completed', 'complete'].includes(raw)) return GoogleFormSubmission.MAIL_STATUS_DONE;
    if (['progress', 'in progress', 'in_progress', 'processing'].includes(raw)) return GoogleFormSubmission.MAIL_STATUS_PROGRESS;
    if (['cancel', 'cancelled', 'canceled'].includes(raw)) return GoogleFormSubmission.MAIL_STATUS_CANCEL;
    if (['pending', 'hold'].includes(raw)) return GoogleFormSubmission.MAIL_STATUS_PENDING;
    return raw;
  }

  static async refreshVerificationFor(instance) {
    const enrollmentValue = String(instance.enrollment_no || '').trim();
    const nameValue = String(instance.student_name || '').trim();

    if (!enrollmentValue) return 'Missing enrollment number';

    let enrollmentObj = null;
    try {
      enrollmentObj = await Enrollment.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('enrollment_no')),
          enrollmentValue.toLowerCase(),
        ),
      });
    } catch (_e) {
      enrollmentObj = null;
    }

    if (!enrollmentObj) return 'Mismatch: enrollment number not found';

    const storedName = String(enrollmentObj.student_name || '').trim();
    if (storedName && nameValue && storedName.toLowerCase() === nameValue.toLowerCase()) return 'Matched';
    if (storedName) return 'Mismatch: student name';
    return 'Matched enrollment; name unavailable';
  }
}

GoogleFormSubmission.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    submitted_at: { type: DataTypes.DATE, allowNull: false, field: 'timestamp' },
    enrollment_no: { type: DataTypes.STRING(64), allowNull: true },
    student_name: { type: DataTypes.STRING(255), allowNull: true },
    rec_institute_name: { type: DataTypes.STRING(512), allowNull: true },
    rec_official_mail: { type: DataTypes.STRING(255), allowNull: true },
    rec_ref_id: { type: DataTypes.STRING(128), allowNull: true },
    send_doc_type: { type: DataTypes.STRING(255), allowNull: true },
    form_submit_mail: { type: DataTypes.STRING(255), allowNull: true },
    mail_req_no: { type: DataTypes.INTEGER, allowNull: true },
    mail_status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: GoogleFormSubmission.MAIL_STATUS_PENDING,
    },
    remark: { type: DataTypes.TEXT, allowNull: true },
    student_verification: { type: DataTypes.STRING(255), allowNull: true },
    raw_row: { type: DataTypes.JSONB, allowNull: true },
    created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    search_vector: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'GoogleFormSubmission',
    tableName: 'google_form_submission',
    timestamps: false,
    indexes: [
      { fields: ['submitted_at'], name: 'idx_gfs_submitted_at' },
      { fields: ['enrollment_no'], name: 'idx_gfs_enrollment' },
      { fields: ['mail_req_no'], name: 'idx_gfs_mail_req_no' },
    ],
  },
);

GoogleFormSubmission.beforeValidate(async (instance) => {
  instance.mail_status = GoogleFormSubmission.normalizeStatus(instance.mail_status);

  const changed =
    instance.isNewRecord ||
    instance.changed('enrollment_no') ||
    instance.changed('student_name') ||
    !instance.student_verification;

  if (changed) {
    instance.student_verification = await GoogleFormSubmission.refreshVerificationFor(instance);
  }
});

export default GoogleFormSubmission;
