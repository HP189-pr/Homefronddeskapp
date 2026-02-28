import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const StudentDegree = sequelize.define('StudentDegree', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  dg_sr_no: { type: DataTypes.STRING(20), allowNull: true },
  enrollment_no: { type: DataTypes.STRING(50), allowNull: false },
  student_name_dg: { type: DataTypes.STRING(200), allowNull: true },
  dg_address: { type: DataTypes.TEXT, allowNull: true },
  institute_name_dg: { type: DataTypes.STRING(200), allowNull: true },
  degree_name: { type: DataTypes.STRING(200), allowNull: true },
  specialisation: { type: DataTypes.STRING(200), allowNull: true },
  seat_last_exam: { type: DataTypes.STRING(100), allowNull: true },
  last_exam_month: { type: DataTypes.STRING, allowNull: true },
  last_exam_year: { type: DataTypes.INTEGER, allowNull: true },
  class_obtain: { type: DataTypes.STRING(50), allowNull: true },
  course_language: { type: DataTypes.STRING(50), allowNull: true },
  dg_rec_no: { type: DataTypes.STRING(50), allowNull: true },
  dg_gender: { type: DataTypes.STRING(10), allowNull: true },
  convocation_no: { type: DataTypes.INTEGER, allowNull: true },
  search_vector: { type: DataTypes.TEXT, allowNull: true },
  dg_contact: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'student_degree',
  timestamps: false,
});

export default StudentDegree;