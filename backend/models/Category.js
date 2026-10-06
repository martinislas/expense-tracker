const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ['expense', 'income'], default: 'expense' },
    color: { type: String, default: '#5B7553' }, // accent used in UI charts
    monthlyBudget: { type: Number, default: 0 } // 0 = no budget set for this category
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
