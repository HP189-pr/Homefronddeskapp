import * as service from '../services/transcriptService.mjs';

export const resubmit = async (req, res, next) => {
  try {
    const data = await service.recordResubmit(req.params.id, req.body.note);
    res.json(data);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
};

export default { resubmit };
