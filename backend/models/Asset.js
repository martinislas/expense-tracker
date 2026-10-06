const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['real-estate', 'vehicle', 'investment', 'retirement', 'business', 'other'],
      default: 'other'
    },
    value: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
