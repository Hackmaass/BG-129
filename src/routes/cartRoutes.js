const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.patch('/item/:productId', cartController.updateCartItem);
router.delete('/remove/:productId', cartController.removeFromCart);

module.exports = router;
