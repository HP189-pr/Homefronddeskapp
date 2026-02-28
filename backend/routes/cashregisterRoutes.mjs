const router = require("express").Router();
const ctrl = require("../controllers/accounts.controller");

router.post("/receipt", ctrl.createReceipt);
router.get("/cash-summary", ctrl.cashSummary);

module.exports = router;
