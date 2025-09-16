// routes/cashbook.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/cashbook.controller");

// Upsert the record for a day
router.post("/cashbook", ctrl.createOrUpdate);

// Get a single day by date (YYYY-MM-DD)
router.get("/cashbook/:date", ctrl.getOne);

// List a range (or all): ?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=30
router.get("/cashbook", ctrl.list);

// Optional: delete a day
router.delete("/cashbook/:date", ctrl.remove);

module.exports = router;
