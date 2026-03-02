import { QueryTypes } from 'sequelize';

let hooksRegistered = false;

function inferApplyForFromDocRecId(docRecId) {
  const dc = String(docRecId || '').trim().toLowerCase();
  if (!dc) return null;
  if (dc.startsWith('vr')) return 'VR';
  if (dc.startsWith('iv')) return 'IV';
  if (dc.startsWith('pr')) return 'PR';
  if (dc.startsWith('mg')) return 'MG';
  if (dc.startsWith('gt')) return 'GT';
  return null;
}

async function updateSearchVector(sequelize, tableName, id, fields = [], config = 'simple') {
  if (!id || !tableName || !Array.isArray(fields) || !fields.length) return;

  const expr = `to_tsvector('${config}', concat_ws(' ', ${fields
    .map((field) => `coalesce(${field}::text,'')`)
    .join(', ')}))`;

  const sql = `UPDATE ${tableName} SET search_vector = ${expr} WHERE id = :id`;

  try {
    await sequelize.query(sql, {
      replacements: { id },
      type: QueryTypes.UPDATE,
    });
  } catch (_e) {
  }
}

async function ensureDocRecExistsAndSync(models, docRecId, srcObj = null) {
  const { DocRec } = models;
  if (!docRecId) return null;

  let dr = await DocRec.findOne({ where: { doc_rec_id: docRecId } });
  if (!dr) {
    dr = await DocRec.create({
      apply_for: inferApplyForFromDocRecId(docRecId) || 'VR',
      doc_rec_id: docRecId,
      pay_by: 'NA',
      doc_rec_date: new Date(),
    });
  }

  if (!srcObj) return dr;

  const srcRemark = srcObj.doc_rec_remark ?? srcObj.doc_remark ?? null;
  const srcPayRecNo = srcObj.pay_rec_no ?? null;

  const patch = {};
  if (srcRemark !== null && dr.doc_rec_remark !== srcRemark) patch.doc_rec_remark = srcRemark;
  if (srcPayRecNo !== null && dr.pay_rec_no !== srcPayRecNo) patch.pay_rec_no = srcPayRecNo;

  if (Object.keys(patch).length) {
    await dr.update(patch);
  }

  return dr;
}

async function maybeCreateVerificationPlaceholder(models, docRec) {
  const { Verification } = models;
  const docRecId = docRec?.doc_rec_id;
  if (!docRecId) return;

  const svc = inferApplyForFromDocRecId(docRecId) || docRec.apply_for;
  if (svc !== 'VR') return;

  const exists = await Verification.findOne({ where: { doc_rec_id: docRecId } });
  if (exists) return;

  try {
    await Verification.create({
      doc_rec_id: docRecId,
      doc_rec_date: docRec.doc_rec_date || new Date(),
      status: 'IN_PROGRESS',
      student_name: '',
      enrollment_no: null,
    });
  } catch (_e) {
  }
}

async function hasOtherServices(models, docRecId, deletedType = null) {
  const checks = [];
  if (deletedType !== 'VR') checks.push(models.Verification.count({ where: { doc_rec_id: docRecId } }));
  if (deletedType !== 'MG') checks.push(models.MigrationRequest.count({ where: { doc_rec_id: docRecId } }));
  if (deletedType !== 'PR') checks.push(models.ProvisionalRequest.count({ where: { doc_rec_id: docRecId } }));
  if (deletedType !== 'IV') checks.push(models.InstLetterMain.count({ where: { doc_rec_id: docRecId } }));

  const counts = await Promise.all(checks);
  return counts.some((count) => Number(count || 0) > 0);
}

async function deleteDocRecIfOrphan(models, docRecId, deletedType) {
  if (!docRecId) return;
  const others = await hasOtherServices(models, docRecId, deletedType);
  if (!others) {
    await models.DocRec.destroy({ where: { doc_rec_id: docRecId } });
  }
}

export function registerModelSignalHooks(models) {
  if (hooksRegistered) return;
  hooksRegistered = true;

  const {
    sequelize,
    Enrollment,
    StudentDegree,
    DocRec,
    Verification,
    MigrationRequest,
    ProvisionalRequest,
    InstLetterMain,
    InstLetterStudent,
    TranscriptRequest,
    GoogleFormSubmission,
  } = models;

  DocRec.addHook('afterSave', async (instance) => {
    try {
      await maybeCreateVerificationPlaceholder(models, instance);
      await updateSearchVector(sequelize, 'doc_rec', instance.id, ['doc_rec_id', 'pay_rec_no', 'pay_rec_no_pre']);
    } catch (_e) {
    }
  });

  DocRec.addHook('afterDestroy', async (instance) => {
    try {
      const docRecId = instance?.doc_rec_id;
      if (!docRecId) return;
      await Verification.destroy({ where: { doc_rec_id: docRecId } });
      await MigrationRequest.destroy({ where: { doc_rec_id: docRecId } });
      await ProvisionalRequest.destroy({ where: { doc_rec_id: docRecId } });
      await InstLetterStudent.destroy({ where: { doc_rec_id: docRecId } });
      await InstLetterMain.destroy({ where: { doc_rec_id: docRecId } });
    } catch (_e) {
    }
  });

  Verification.addHook('afterSave', async (instance) => {
    try {
      if (instance.doc_rec_id) await ensureDocRecExistsAndSync(models, instance.doc_rec_id, instance);
      await updateSearchVector(
        sequelize,
        'verification',
        instance.id,
        ['enrollment_no', 'second_enrollment_id', 'student_name', 'final_no', 'pay_rec_no'],
      );
    } catch (_e) {
    }
  });

  Verification.addHook('afterDestroy', async (instance) => {
    try {
      await deleteDocRecIfOrphan(models, instance?.doc_rec_id, 'VR');
    } catch (_e) {
    }
  });

  MigrationRequest.addHook('afterSave', async (instance) => {
    try {
      if (instance.doc_rec_id) await ensureDocRecExistsAndSync(models, instance.doc_rec_id, instance);
    } catch (_e) {
    }
  });

  MigrationRequest.addHook('afterDestroy', async (instance) => {
    try {
      await deleteDocRecIfOrphan(models, instance?.doc_rec_id, 'MG');
    } catch (_e) {
    }
  });

  ProvisionalRequest.addHook('afterSave', async (instance) => {
    try {
      if (instance.doc_rec_id) await ensureDocRecExistsAndSync(models, instance.doc_rec_id, instance);
    } catch (_e) {
    }
  });

  ProvisionalRequest.addHook('afterDestroy', async (instance) => {
    try {
      await deleteDocRecIfOrphan(models, instance?.doc_rec_id, 'PR');
    } catch (_e) {
    }
  });

  InstLetterMain.addHook('afterSave', async (instance) => {
    try {
      if (instance.doc_rec_id) await ensureDocRecExistsAndSync(models, instance.doc_rec_id, instance);
      await updateSearchVector(sequelize, 'inst_verification_main', instance.id, [
        'inst_veri_number',
        'rec_inst_name',
        'inst_ref_no',
      ]);
    } catch (_e) {
    }
  });

  InstLetterMain.addHook('afterDestroy', async (instance) => {
    try {
      const docRecId = instance?.doc_rec_id;
      if (!docRecId) return;
      await InstLetterStudent.destroy({ where: { doc_rec_id: docRecId } });
      await deleteDocRecIfOrphan(models, docRecId, 'IV');
    } catch (_e) {
    }
  });

  Enrollment.addHook('afterSave', async (instance) => {
    try {
      await updateSearchVector(sequelize, 'enrollment', instance.id, ['enrollment_no', 'temp_enroll_no', 'student_name']);
    } catch (_e) {
    }
  });

  StudentDegree.addHook('afterSave', async (instance) => {
    try {
      await updateSearchVector(sequelize, 'student_degree', instance.id, [
        'enrollment_no',
        'student_name_dg',
        'dg_sr_no',
        'degree_name',
        'institute_name_dg',
        'specialisation',
        'class_obtain',
        'dg_contact',
        'course_language',
        'dg_address',
        'dg_rec_no',
        'seat_last_exam',
      ]);
    } catch (_e) {
    }
  });

  TranscriptRequest.addHook('afterSave', async (instance) => {
    try {
      await updateSearchVector(sequelize, 'transcript_request', instance.id, [
        'enrollment_no',
        'student_name',
        'trn_reqest_ref_no',
      ]);
    } catch (_e) {
    }
  });

  GoogleFormSubmission.addHook('afterSave', async (instance) => {
    try {
      await updateSearchVector(sequelize, 'google_form_submission', instance.id, [
        'enrollment_no',
        'student_name',
        'rec_institute_name',
        'rec_official_mail',
        'rec_ref_id',
      ]);
    } catch (_e) {
    }
  });
}

export default {
  registerModelSignalHooks,
};
