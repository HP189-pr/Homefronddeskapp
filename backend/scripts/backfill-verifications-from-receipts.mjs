// backend/scripts/backfill-verifications-from-receipts.mjs
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../db.mjs';
import '../models/index.mjs';
import DocumentReceipt from '../models/document_receipt.mjs';
import Verification from '../models/verification.mjs';

async function run() {
  try {
    const receipts = await DocumentReceipt.findAll({ where: { doc_type: 'verification' } });
    let created = 0, updated = 0;
    for (const r of receipts) {
      if (!r.vryearautonumber) continue;
      const existing = await Verification.findOne({ where: { vryearautonumber: r.vryearautonumber } });
      const payload = {
        doc_rec_date: r.doc_rec_date,
        enrollment_no: r.enrollment_no,
        studentname: r.studentname,
        no_of_transcript: r.no_of_transcript,
        no_of_marksheet_set: r.no_of_marksheet_set,
        no_of_degree: r.no_of_degree,
        no_of_moi: r.no_of_moi,
        no_of_backlog: r.no_of_backlog,
        vryearautonumber: r.vryearautonumber,
      };
      if (existing) {
        await existing.update(payload);
        updated++;
      } else {
        try {
          await Verification.create({ ...payload, status: 'in-progress' });
          created++;
        } catch (e) {
          // enum may not include in-progress yet
          await Verification.create({ ...payload, status: 'pending' });
          created++;
        }
      }
    }
    console.log(`Backfill complete. Receipts: ${receipts.length}, created: ${created}, updated: ${updated}`);
  } catch (err) {
    console.error('Backfill failed', err);
  } finally {
    await sequelize.close();
  }
}

run();
