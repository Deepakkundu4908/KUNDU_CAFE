const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    name: { type: String, default: '' },
    dietary: { type: String, default: '' },
    category: { type: String, default: '' }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    userId: { type: Number, required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    totalPrice: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    pickupTime: { type: Date, default: null },
    notes: { type: String, default: '' },
    paymentMethod: { type: String, default: 'cash' }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
