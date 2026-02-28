const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {

  /* ================= MAIN LETTER ================= */

  const InstLetterMain = sequelize.define(
    "InstLetterMain",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      doc_rec_id: DataTypes.STRING,
      inst_veri_number: DataTypes.STRING,
      inst_veri_date: DataTypes.DATEONLY,
      institute_id: DataTypes.INTEGER,

      iv_record_no: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      rec_inst_name: DataTypes.STRING,
      rec_inst_address_1: DataTypes.STRING,
      rec_inst_address_2: DataTypes.STRING,
      rec_inst_location: DataTypes.STRING,
      rec_inst_city: DataTypes.STRING,
      rec_inst_pin: DataTypes.STRING,
      rec_inst_email: DataTypes.STRING,
      rec_inst_phone: DataTypes.STRING,

      doc_types: DataTypes.STRING,
      rec_inst_sfx_name: DataTypes.STRING,

      iv_status: {
        type: DataTypes.STRING,
        validate: {
          isIn: [["Pending", "Done", "Correction", "Post", "Mail"]],
        },
      },

      rec_by: DataTypes.STRING,
      doc_rec_date: DataTypes.DATEONLY,

      inst_ref_no: DataTypes.STRING,
      ref_date: DataTypes.DATEONLY,
    },
    {
      tableName: "inst_verification_main",
      timestamps: false,
      indexes: [
        { fields: ["doc_rec_id"] },
        { fields: ["inst_veri_number"] },
        { fields: ["iv_record_no"] },
      ],
    }
  );

  /* ===== compute iv_record_no (same logic as Django) ===== */

  function computeRecordNo(instVeriNumber) {
    if (!instVeriNumber) return null;

    const s = instVeriNumber.trim();
    const digits = s.replace(/\D/g, "");

    if (digits.length >= 3) {
      const year = digits.slice(0, 2);
      const seq = digits.slice(-3);
      return parseInt(year + seq);
    }

    return null;
  }

  InstLetterMain.beforeSave((rec) => {
    const val = computeRecordNo(rec.inst_veri_number);
    if (val) rec.iv_record_no = val;
  });

  /* ================= STUDENTS ================= */

  const InstLetterStudent = sequelize.define(
    "InstLetterStudent",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      doc_rec_id: DataTypes.STRING,
      sr_no: DataTypes.INTEGER,

      enrollment_no: DataTypes.STRING,
      enrollment_no_text: DataTypes.STRING,

      student_name: DataTypes.STRING,

      type_of_credential: DataTypes.STRING,
      month_year: DataTypes.STRING,
      verification_status: DataTypes.STRING,
      iv_degree_name: DataTypes.STRING,
      study_mode: DataTypes.STRING,
    },
    {
      tableName: "inst_verification_student",
      timestamps: false,
      indexes: [
        { fields: ["doc_rec_id"] },
        { fields: ["enrollment_no"] },
      ],
    }
  );

  /* ================= ASSOCIATION ================= */

  InstLetterMain.hasMany(InstLetterStudent, {
    foreignKey: "doc_rec_id",
    sourceKey: "doc_rec_id",
    as: "students",
  });

  InstLetterStudent.belongsTo(InstLetterMain, {
    foreignKey: "doc_rec_id",
    targetKey: "doc_rec_id",
  });

  return { InstLetterMain, InstLetterStudent };
};
