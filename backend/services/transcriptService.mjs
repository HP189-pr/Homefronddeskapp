const { Verification } = require("../db");

exports.recordResubmit = async (id, note) => {
  const rec = await Verification.findByPk(id);

  rec.last_resubmit_date = new Date();
  rec.last_resubmit_status = "CORRECTION";
  rec.status = "IN_PROGRESS";

  if (note)
    rec.doc_remark = (rec.doc_remark || "") + `\n[Resubmit] ${note}`;

  return rec.save();
};
