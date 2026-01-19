// backend/models/eca.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const Eca = sequelize.define('Eca', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  doc_rec_id: { type: DataTypes.STRING(20), allowNull: true }, // references doc_rec.doc_rec_id (string)
  eca_name: { type: DataTypes.STRING(255), allowNull: true },
  eca_ref_no: { type: DataTypes.STRING(100), allowNull: true },
  eca_send_date: { type: DataTypes.DATEONLY, allowNull: true },
  eca_remark: { type: DataTypes.TEXT, allowNull: true },

  createdby: { type: DataTypes.BIGINT, allowNull: true },

  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eca',
  timestamps: false,
  indexes: [
    { fields: ['doc_rec_id'], name: 'idx_eca_doc_rec' }
  ]
});

export default Eca;
