import { sequelize } from '../db.mjs';

const CREATE_INDEX_QUERIES = [
  'CREATE INDEX IF NOT EXISTS idx_enrollment_enrollment_no ON enrollment (enrollment_no)',
  'CREATE INDEX IF NOT EXISTS idx_enrollment_temp_enroll_no ON enrollment (temp_enroll_no)',
  'CREATE INDEX IF NOT EXISTS idx_enrollment_student_name ON enrollment (student_name)',

  'CREATE INDEX IF NOT EXISTS idx_student_profile_enrollment_no ON student_profile (enrollment_no)',
  'CREATE INDEX IF NOT EXISTS idx_student_profile_temp_enroll_no ON student_profile (temp_enroll_no)',

  'CREATE INDEX IF NOT EXISTS idx_verification_enrollment_no ON verification (enrollment_no)',
  'CREATE INDEX IF NOT EXISTS idx_verification_second_enrollment_id ON verification (second_enrollment_id)',
  'CREATE INDEX IF NOT EXISTS idx_verification_doc_rec_id ON verification (doc_rec_id)',

  'CREATE INDEX IF NOT EXISTS idx_provisional_enrollment_no ON provisional (enrollment_no)',
  'CREATE INDEX IF NOT EXISTS idx_provisional_doc_rec_id ON provisional (doc_rec_id)',

  'CREATE INDEX IF NOT EXISTS idx_migration_enrollment_no ON migration (enrollment_no)',
  'CREATE INDEX IF NOT EXISTS idx_migration_doc_rec_id ON migration (doc_rec_id)',

  'CREATE INDEX IF NOT EXISTS idx_inst_verification_student_enrollment_no ON inst_verification_student (enrollment_no)',
  'CREATE INDEX IF NOT EXISTS idx_inst_verification_student_enrollment_no_text ON inst_verification_student (enrollment_no_text)',
  'CREATE INDEX IF NOT EXISTS idx_inst_verification_student_doc_rec_id ON inst_verification_student (doc_rec_id)',

  'CREATE INDEX IF NOT EXISTS idx_student_degree_enrollment_no ON student_degree (enrollment_no)',
];

export async function ensurePerformanceIndexes() {
  const enabled = String(process.env.DB_ENSURE_PERF_INDEXES || 'true').toLowerCase() !== 'false';
  if (!enabled) return;

  for (const sql of CREATE_INDEX_QUERIES) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn('[db-index] skipped:', msg);
    }
  }
}

export default {
  ensurePerformanceIndexes,
};
