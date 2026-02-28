const { StudentFeesLedger, Enrollment, User } = require("../models");

exports.create = async (data, userId) => {

  const studentNo = data.student_no.trim();

  // ✅ find enrollment (enrollment_no OR temp)
  const enrollment = await Enrollment.findOne({
    where: {
      [Op.or]: [
        { enrollment_no: studentNo },
        { temp_enroll_no: studentNo },
      ],
    },
  });

  if (!enrollment) {
    throw new Error(`Student '${studentNo}' not found`);
  }

  // ✅ unique receipt check
  if (data.receipt_no) {
    const exists = await StudentFeesLedger.findOne({
      where: { receipt_no: data.receipt_no },
    });

    if (exists) {
      throw new Error("Receipt number already exists");
    }
  }

  // ✅ create
  const fee = await StudentFeesLedger.create({
    enrollment_id: enrollment.id,
    receipt_no: data.receipt_no,
    receipt_date: data.receipt_date,
    term: data.term,
    amount: data.amount,
    remark: data.remark,
    created_by: userId,
  });

  return fee;
};
