const { InstLetterMain, InstLetterStudent } = require("../db");

/* create main letter + students */
exports.createLetter = async (payload) => {
  const { students, ...main } = payload;

  const record = await InstLetterMain.create(main);

  if (students?.length) {
    students.forEach((s) => (s.doc_rec_id = main.doc_rec_id));
    await InstLetterStudent.bulkCreate(students);
  }

  return record;
};

/* get letter with students */
exports.getLetter = async (docRecId) => {
  return InstLetterMain.findOne({
    where: { doc_rec_id: docRecId },
    include: ["students"],
  });
};

/* delete letter */
exports.deleteLetter = async (docRecId) => {
  await InstLetterStudent.destroy({ where: { doc_rec_id: docRecId } });
  return InstLetterMain.destroy({ where: { doc_rec_id: docRecId } });
};
