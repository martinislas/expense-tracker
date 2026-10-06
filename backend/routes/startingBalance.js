const express = require('express');
const router = express.Router();
const StartingBalance = require('../models/StartingBalance');

const DEFAULT_DATE = new Date(Date.UTC(2026, 5, 1));

router.get('/', async (req, res, next) => {
  try {
    const startingBalance = await StartingBalance.findOne({ key: 'primary' });
    res.json(
      startingBalance || {
        amount: 0,
        effectiveDate: DEFAULT_DATE,
        configured: false
      }
    );
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount)) {
      return res.status(400).json({ error: 'Starting balance must be a valid number' });
    }

    const startingBalance = await StartingBalance.findOneAndUpdate(
      { key: 'primary' },
      { amount, effectiveDate: DEFAULT_DATE },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(startingBalance);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
