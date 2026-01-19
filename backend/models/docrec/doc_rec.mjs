// backend/models/doc_rec.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const DocRec = sequelize.define('DocRec', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  apply_for: { type: DataTypes.ENUM('VR','IV','PR','MG','GT'), allowNull: false },
  doc_rec_id: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  pay_by: { type: DataTypes.ENUM('CASH','BANK','UPI','NA'), allowNull: false },
  pay_rec_no_pre: { type: DataTypes.STRING(20), allowNull: true },
  pay_rec_no: { type: DataTypes.STRING(50), allowNull: true },
  pay_amount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },

  // Shared fields visible across services
  enrollment_no: { type: DataTypes.STRING(100), allowNull: true },
  student_name: { type: DataTypes.STRING(255), allowNull: true },
  doc_rec_remark: { type: DataTypes.TEXT, allowNull: true },

  created_by: { type: DataTypes.BIGINT, allowNull: true },

  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: 'doc_rec',
  timestamps: false,
  indexes: [
    { fields: ['doc_rec_id'], name: 'idx_doc_rec_id' },
    { fields: ['pay_rec_no'], name: 'idx_doc_pay_rec' }
  ]
});

export default DocRec;
