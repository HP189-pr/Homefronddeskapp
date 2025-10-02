import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const Degree = sequelize.define('Degree', {
	id: {
		type: DataTypes.INTEGER,
		allowNull: false,
		primaryKey: true,
		autoIncrement: true,
	},
	dg_sr_no: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	enrollment_no: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	student_name_dg: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	dg_address: {
		type: DataTypes.TEXT,
		allowNull: true,
	},
	institute_name_dg: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	degree_name: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	specialisation: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	seat_last_exam: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	last_exam_month: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	last_exam_year: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	class_obtain: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	course_language: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	dg_rec_no: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	dg_gender: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	convocation_no: {
		type: DataTypes.STRING,
		allowNull: false,
	},
}, {
	tableName: 'degree',
	timestamps: false,
});
