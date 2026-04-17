const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.post('/checkout', orderController.checkout);
router.get('/', orderController.getOrderHistory);

module.exports = router;
