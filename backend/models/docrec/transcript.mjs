const { DataTypes } = require("sequelize");
const { MailStatus, VerificationStatus } = require("../constants/status.constants");

module.exports = (sequelize) => {
  const Verification = sequelize.define(
    "Verification",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      student_name: DataTypes.STRING,
      enrollment_no: DataTypes.STRING,
      second_enrollment_id: DataTypes.STRING,

      tr_count: DataTypes.SMALLINT,
      ms_count: DataTypes.SMALLINT,
      dg_count: DataTypes.SMALLINT,
      moi_count: DataTypes.SMALLINT,
      backlog_count: DataTypes.SMALLINT,

      pay_rec_no: DataTypes.STRING,

      status: {
        type: DataTypes.STRING,
        validate: { isIn: [VerificationStatus] },
      },

      final_no: DataTypes.STRING,

      mail_status: {
        type: DataTypes.STRING,
        defaultValue: "NOT_SENT",
        validate: { isIn: [MailStatus] },
      },

      eca_required: DataTypes.BOOLEAN,
      eca_send_date: DataTypes.DATEONLY,
      eca_resubmit_date: DataTypes.DATEONLY,

      eca_status: {
        type: DataTypes.STRING,
        defaultValue: "NOT_SENT",
        validate: { isIn: [MailStatus] },
      },

      doc_remark: DataTypes.TEXT,
      doc_rec_id: DataTypes.STRING,

      doc_rec_date: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
      tableName: "verification",
      timestamps: true,
      createdAt: "createdat",
      updatedAt: "updatedat",
    }
  );

  /* Hooks replacing clean() */
  Verification.beforeSave((rec) => {
    const fields = ["tr_count","ms_count","dg_count","moi_count","backlog_count"];

    fields.forEach((f) => {
      if (rec[f] != null && (rec[f] < 0 || rec[f] > 32767))
        throw new Error(`${f} must be between 0 and 32767`);
    });

    if (rec.status === "DONE" && !rec.final_no)
      throw new Error("final_no required when DONE");

    if (["PENDING", "CANCEL"].includes(rec.status) && rec.final_no)
      throw new Error("final_no must be empty");

    if (rec.eca_send_date && (!rec.eca_status || rec.eca_status === "NOT_SENT"))
      rec.eca_status = "SENT";
  });

  return Verification;
};
