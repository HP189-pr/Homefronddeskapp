const router = require("express").Router();
const ctrl = require("../controllers/instLetter.controller");

router.post("/", ctrl.create);
router.get("/:docRecId", ctrl.getOne);
router.delete("/:docRecId", ctrl.remove);

module.exports = router;
