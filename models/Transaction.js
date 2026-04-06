const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    userId: { type: Number, required: true, index: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    reference: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
