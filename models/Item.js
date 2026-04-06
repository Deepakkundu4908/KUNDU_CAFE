const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: '' },
    price: { type: Number, required: true },
    dietary: { type: String, default: 'Veg' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    isOutOfStock: { type: Boolean, default: false },
    prepTime: { type: Number, default: 15 },
    popularity: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.models.Item || mongoose.model('Item', itemSchema);
