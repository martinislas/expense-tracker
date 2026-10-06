const mongoose = require('mongoose');

// One document per calendar month, e.g. month: "2026-09"
const budgetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true },
    totalBudget: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
