const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all products
router.get('/', productController.getAllProducts);

// Get products by category and dietary filters
router.get('/menu', productController.getProductsByCategory);

// Get frequent orders (API endpoint)
router.get('/frequent', productController.getFrequentOrders);

// Search products
router.get('/search', productController.searchProducts);

// Get single product
router.get('/:id', productController.getProduct);

module.exports = router;
