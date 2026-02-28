import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

const PROVISIONAL_STATUSES = ['Pending', 'Issued', 'Cancelled', 'Correction'];

export const ProvisionalRequest = sequelize.define(
  'ProvisionalRequest',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    doc_rec_id: DataTypes.STRING,
    enrollment_no: DataTypes.STRING,
    student_name: DataTypes.STRING,

    institute_id: DataTypes.INTEGER,
    maincourse_id: DataTypes.INTEGER,
    subcourse_id: DataTypes.INTEGER,

    class_obtain: DataTypes.STRING,
    prv_number: { type: DataTypes.STRING, unique: true },
    prv_date: DataTypes.DATEONLY,
    passing_year: DataTypes.STRING,
    prv_degree_name: DataTypes.STRING,

    prv_status: {
      type: DataTypes.STRING,
      defaultValue: 'Issued',
      validate: { isIn: [PROVISIONAL_STATUSES] },
    },

    pay_rec_no: DataTypes.STRING,
    doc_remark: DataTypes.STRING,
  },
  {
    tableName: 'provisional',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default ProvisionalRequest;
