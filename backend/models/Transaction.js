const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }, // positive = income, negative = expense
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    type: { type: String, enum: ['expense', 'income'], required: true },
    source: { type: String, enum: ['manual', 'import'], default: 'manual' },
    notes: { type: String, trim: true, default: '' },
    // Set when the money moved into an asset: a transfer, not an expense
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
    // Helps avoid duplicate rows when re-importing overlapping bank statements
    importHash: { type: String, default: null, index: true }
  },
  { timestamps: true }
);

transactionSchema.index({ date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
