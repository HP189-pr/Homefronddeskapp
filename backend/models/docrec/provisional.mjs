const { DataTypes } = require("sequelize");
const { ProvisionalStatus } = require("../constants/status.constants");

module.exports = (sequelize) => {
  return sequelize.define(
    "ProvisionalRecord",
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
        defaultValue: "Issued",
        validate: { isIn: [ProvisionalStatus] },
      },

      pay_rec_no: DataTypes.STRING,
      doc_remark: DataTypes.STRING,
    },
    {
      tableName: "provisional",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
};
