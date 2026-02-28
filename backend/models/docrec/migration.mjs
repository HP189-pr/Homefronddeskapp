import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

const MIGRATION_STATUSES = ['Pending', 'Issued', 'Cancelled', 'Correction'];

export const MigrationRequest = sequelize.define(
  'MigrationRequest',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    doc_rec_id: DataTypes.STRING,
    enrollment_no: DataTypes.STRING,
    student_name: DataTypes.STRING,

    institute_id: DataTypes.INTEGER,
    maincourse_id: DataTypes.INTEGER,
    subcourse_id: DataTypes.INTEGER,

    mg_number: { type: DataTypes.STRING, unique: true },
    mg_date: DataTypes.DATEONLY,
    exam_year: DataTypes.STRING,
    admission_year: DataTypes.STRING,

    exam_details: DataTypes.TEXT,

    mg_status: {
      type: DataTypes.STRING,
      defaultValue: 'Pending',
      validate: { isIn: [MIGRATION_STATUSES] },
    },

    pay_rec_no: DataTypes.STRING,
    doc_remark: DataTypes.STRING,
  },
  {
    tableName: 'migration',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default MigrationRequest;
