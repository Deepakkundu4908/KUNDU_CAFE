const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get cart
router.get('/', cartController.getCart);
router.get('/data', cartController.getCartData);

// Add to cart
router.post('/add', cartController.addToCart);

// Update quantity
router.post('/update', cartController.updateQuantity);

// Remove from cart
router.post('/remove/:itemId', cartController.removeFromCart);

// Clear cart
router.post('/clear', cartController.clearCart);

module.exports = router;
