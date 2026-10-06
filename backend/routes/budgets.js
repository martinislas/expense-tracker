const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');

// GET budget for a given month, e.g. /api/budgets/2026-09
router.get('/:month', async (req, res, next) => {
  try {
    let budget = await Budget.findOne({ month: req.params.month });
    if (!budget) {
      budget = { month: req.params.month, totalBudget: 0 };
    }
    res.json(budget);
  } catch (err) {
    next(err);
  }
});

// PUT set/update the overall budget for a month (upsert)
router.put('/:month', async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { month: req.params.month },
      { totalBudget: req.body.totalBudget },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(budget);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
