const service = require("../services/instLetter.service");

exports.create = async (req, res) => {
  try {
    const data = await service.createLetter(req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  const data = await service.getLetter(req.params.docRecId);
  res.json(data);
};

exports.remove = async (req, res) => {
  await service.deleteLetter(req.params.docRecId);
  res.json({ success: true });
};
