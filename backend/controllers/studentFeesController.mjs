const feeService = require("../services/studentFeesService");

// CREATE
exports.create = async (req, res) => {
  try {
    const { student_no, receipt_no, receipt_date, amount } = req.body;

    // ✅ required
    if (!student_no?.trim()) {
      return res.status(400).json({ message: "Student number is required" });
    }

    // ✅ at least one field
    if (!receipt_no && !receipt_date && !amount) {
      return res.status(400).json({
        message: "Provide receipt_no, receipt_date, or amount",
      });
    }

    // ✅ amount validation
    if (amount && Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }

    const result = await feeService.create(req.body, req.user.id);

    res.status(201).json({
      message: "Fee entry created successfully",
      data: result,
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
