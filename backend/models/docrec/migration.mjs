const { DataTypes } = require("sequelize");
const { MigrationStatus } = require("../constants/status.constants");

module.exports = (sequelize) => {
  return sequelize.define(
    "MigrationRecord",
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
        defaultValue: "Pending",
        validate: { isIn: [MigrationStatus] },
      },

      pay_rec_no: DataTypes.STRING,
      doc_remark: DataTypes.STRING,
    },
    {
      tableName: "migration",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
};
