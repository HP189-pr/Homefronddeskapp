const service = require("../services/leave.service");

exports.applyLeave = async (req, res) => {
  try {
    const data = await service.createLeave(req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
