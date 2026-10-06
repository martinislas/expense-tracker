const mongoose = require('mongoose');

const startingBalanceSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'primary', unique: true },
    amount: { type: Number, required: true, default: 0 },
    effectiveDate: { type: Date, required: true, default: () => new Date(Date.UTC(2026, 5, 1)) }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StartingBalance', startingBalanceSchema);
