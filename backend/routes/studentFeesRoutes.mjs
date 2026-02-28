const express = require("express");
const router = express.Router();

const controller = require("../controllers/studentFeesController");
const auth = require("../middleware/authMiddleware"); // if you use JWT

// protect all routes
router.use(auth);

/*
==============================
   STUDENT FEES ROUTES
==============================
*/

// CREATE
router.post("/", controller.create);

// LIST (with filters)
router.get("/", controller.list);

// GET SINGLE
router.get("/:id", controller.getOne);

// UPDATE
router.put("/:id", controller.update);
router.patch("/:id", controller.update);

// DELETE
router.delete("/:id", controller.remove);

// SUMMARY
router.get("/summary/student", controller.summary);

// BY TERM
router.get("/summary/by-term", controller.byTerm);

module.exports = router;
