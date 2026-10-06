const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Transaction = require('../models/Transaction');

const FIELDS = ['name', 'type', 'value', 'notes'];

const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(body, f)).map((f) => [f, body[f]]));

// Money moved into an asset (negative cash transactions linked to it) adds to its value
router.get('/', async (req, res, next) => {
  try {
    const [assets, transfers] = await Promise.all([
      Asset.find().lean(),
      Transaction.aggregate([
        { $match: { asset: { $ne: null } } },
        { $group: { _id: '$asset', total: { $sum: { $multiply: ['$amount', -1] } } } }
      ])
    ]);
    const byAsset = new Map(transfers.map((t) => [t._id.toString(), t.total]));
    res.json(
      assets
        .map((a) => {
          const contributions = byAsset.get(a._id.toString()) || 0;
          return { ...a, contributions, currentValue: a.value + contributions };
        })
        .sort((a, b) => b.currentValue - a.currentValue)
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body);
    data.value = Number(data.value);
    if (!Number.isFinite(data.value) || data.value < 0) {
      return res.status(400).json({ error: 'Value must be a non-negative number' });
    }
    res.status(201).json(await Asset.create(data));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (data.value !== undefined) {
      data.value = Number(data.value);
      if (!Number.isFinite(data.value) || data.value < 0) {
        return res.status(400).json({ error: 'Value must be a non-negative number' });
      }
    }
    const asset = await Asset.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
