const router = require("express").Router();
const ctrl = require("../controllers/trasncript.controller");

router.post("/:id/resubmit", ctrl.resubmit);

module.exports = router;
