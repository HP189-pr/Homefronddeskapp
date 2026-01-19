// backend/models/inst_verification_main.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const InstVerificationMain = sequelize.define('InstVerificationMain', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  doc_rec_id: { type: DataTypes.STRING(20), allowNull: true },
  inst_veri_number: { type: DataTypes.STRING(100), allowNull: true },
  inst_veri_date: { type: DataTypes.DATEONLY, allowNull: true },

  institute_id: { type: DataTypes.BIGINT, allowNull: true },
  rec_inst_name: { type: DataTypes.STRING(255), allowNull: true },
  rec_inst_address_1: { type: DataTypes.STRING(255), allowNull: true },
  rec_inst_address_2: { type: DataTypes.STRING(255), allowNull: true },
  rec_inst_location: { type: DataTypes.STRING(255), allowNull: true },
  rec_inst_city: { type: DataTypes.STRING(255), allowNull: true },
  rec_inst_pin: { type: DataTypes.STRING(20), allowNull: true },
  rec_inst_email: { type: DataTypes.STRING(255), allowNull: true },

  rec_by: { type: DataTypes.STRING(255), allowNull: true },

  doc_rec_date: { type: DataTypes.DATEONLY, allowNull: true },
  inst_ref_no: { type: DataTypes.STRING(100), allowNull: true },
  ref_date: { type: DataTypes.DATEONLY, allowNull: true },

}, {
  tableName: 'inst_verification_main',
  timestamps: false,
  indexes: [
    { fields: ['doc_rec_id'], name: 'idx_ivm_doc_rec' },
    { fields: ['institute_id'], name: 'idx_ivm_institute' },
    { fields: ['inst_veri_number'], name: 'idx_ivm_veri_no' }
  ]
});

export default InstVerificationMain;
