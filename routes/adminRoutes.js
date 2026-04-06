const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminMiddleware } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

router.use(adminMiddleware);

router.get('/', adminController.getDashboard);
router.get('/data', adminController.getDashboardData);
router.post('/broadcast', adminController.broadcastMessage);
router.post('/users/:id/toggle-status', adminController.toggleUserStatus);
router.post('/orders/:id/status', adminController.updateOrderStatus);
router.post('/items/:id/stock-toggle', adminController.toggleStock);
router.post('/items', upload.single('imageFile'), adminController.createMenuItem);
router.post('/items/:id', upload.single('imageFile'), adminController.updateMenuItem);

module.exports = router;
