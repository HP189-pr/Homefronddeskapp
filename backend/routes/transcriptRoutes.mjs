const service = require("../services/transcriptservice");

exports.resubmit = async (req, res) => {
  const data = await service.recordResubmit(
    req.params.id,
    req.body.note
  );
  res.json(data);
};
