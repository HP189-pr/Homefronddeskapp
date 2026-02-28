import * as service from '../services/instLetterService.mjs';

export const create = async (req, res, next) => {
  try {
    const data = await service.createLetter(req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await service.getLetter(req.params.docRecId);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteLetter(req.params.docRecId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export default { create, getOne, remove };
