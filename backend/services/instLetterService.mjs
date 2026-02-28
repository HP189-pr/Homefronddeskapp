import { InstLetterMain, InstLetterStudent } from '../models/docrec/instLetter.mjs';

export async function createLetter(payload = {}) {
  const { students, ...main } = payload;

  const record = await InstLetterMain.create(main);

  if (students?.length) {
    const rows = students.map((s) => ({ ...s, doc_rec_id: main.doc_rec_id }));
    await InstLetterStudent.bulkCreate(rows);
  }

  return record;
}

export async function getLetter(docRecId) {
  return InstLetterMain.findOne({
    where: { doc_rec_id: docRecId },
    include: [{ model: InstLetterStudent, as: 'students' }],
  });
}

export async function deleteLetter(docRecId) {
  await InstLetterStudent.destroy({ where: { doc_rec_id: docRecId } });
  return InstLetterMain.destroy({ where: { doc_rec_id: docRecId } });
}

export default { createLetter, getLetter, deleteLetter };
