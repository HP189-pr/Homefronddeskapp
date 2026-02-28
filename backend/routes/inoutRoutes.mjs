const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/registerController");

/* ===== INWARD ===== */

router.post("/inward", ctrl.createInward);
router.get("/inward", ctrl.listInward);
router.get("/inward/next-number", ctrl.nextInwardNumber);

/* ===== OUTWARD ===== */

router.post("/outward", ctrl.createOutward);
router.get("/outward", ctrl.listOutward);
router.get("/outward/next-number", ctrl.nextOutwardNumber);

module.exports = router;
