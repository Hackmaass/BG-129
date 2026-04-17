const { db, collection, doc, getDoc, setDoc } = require('../config/firebaseAdmin');

const DEFAULT_USER_ID = 'guest';

// For testing purposes before auth middleware is added, we resolve from header.
const resolveUserId = (req) => req.headers['x-user-id'] || DEFAULT_USER_ID;

const buildCartResponse = (cartItems = []) => {
    const items = cartItems.map((item) => ({
        ...item,
        lineTotal: Number((item.price * item.quantity).toFixed(2)),
    }));

    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

    return {
        items,
        subtotal,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    };
};

const getCartRef = (userId) => doc(db, 'carts', String(userId));

exports.getCart = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        const docSnap = await getDoc(getCartRef(userId));
        
        const items = docSnap.exists() ? docSnap.data().items || [] : [];

        res.status(200).json({
            status: 'success',
            data: buildCartResponse(items),
        });
    } catch (error) {
        next(error);
    }
};

exports.addToCart = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        const { productId, quantity = 1 } = req.body;

        const requestedProductId = String(productId);
        const requestedQuantity = Number(quantity);

        if (!requestedProductId || !requestedQuantity || requestedQuantity < 1) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid productId and quantity (>= 1) are required.',
            });
        }

        // Fetch product to verify and get price
        const productRef = doc(db, 'products', requestedProductId);
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
            return res.status(404).json({
                status: 'error',
                message: `Product with id ${requestedProductId} not found.`,
            });
        }

        const product = productDoc.data();

        // Get current cart
        const cartRef = getCartRef(userId);
        const cartDoc = await getDoc(cartRef);
        let items = cartDoc.exists() ? cartDoc.data().items || [] : [];

        const existingItemIndex = items.findIndex((item) => item.productId === requestedProductId);
        const existingQuantity = existingItemIndex !== -1 ? items[existingItemIndex].quantity : 0;

        if (existingQuantity + requestedQuantity > product.inventory) {
            return res.status(400).json({
                status: 'error',
                message: `Insufficient inventory for product ${product.name}.`,
            });
        }

        if (existingItemIndex !== -1) {
            items[existingItemIndex].quantity += requestedQuantity;
        } else {
            items.push({
                productId: requestedProductId,
                name: product.name,
                price: product.price,
                quantity: requestedQuantity,
            });
        }

        await setDoc(cartRef, { items }, { merge: true });

        return res.status(201).json({
            status: 'success',
            message: 'Item added to cart.',
            data: buildCartResponse(items),
        });
    } catch (error) {
        next(error);
    }
};

exports.removeFromCart = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        const productId = String(req.params.productId);
        
        const cartRef = getCartRef(userId);
        const cartDoc = await getDoc(cartRef);
        
        if (!cartDoc.exists()) {
             return res.status(404).json({
                status: 'error',
                message: `Cart is empty.`,
            });
        }

        let items = cartDoc.data().items || [];
        const itemIndex = items.findIndex((item) => item.productId === productId);

        if (itemIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: `Product ${productId} is not in cart.`,
            });
        }

        items.splice(itemIndex, 1);
        await setDoc(cartRef, { items }, { merge: true });

        return res.status(200).json({
            status: 'success',
            message: `Product ${productId} removed from cart.`,
            data: buildCartResponse(items),
        });
    } catch (error) {
        next(error);
    }
};

exports.updateCartItem = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        const productId = String(req.params.productId);
        const quantity = Number(req.body.quantity);

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                status: 'error',
                message: 'quantity must be >= 1.',
            });
        }

        const cartRef = getCartRef(userId);
        const cartDoc = await getDoc(cartRef);
        
        if (!cartDoc.exists()) {
             return res.status(404).json({
                status: 'error',
                message: `Cart is empty.`,
            });
        }

        let items = cartDoc.data().items || [];
        const itemIndex = items.findIndex((item) => item.productId === productId);

        if (itemIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: `Product ${productId} is not in cart.`,
            });
        }
        
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
             return res.status(404).json({
                status: 'error',
                message: `Product with id ${productId} not found.`,
            });
        }
        
        const product = productDoc.data();

        if (quantity > product.inventory) {
            return res.status(400).json({
                status: 'error',
                message: `Requested quantity exceeds inventory for ${product.name}.`,
            });
        }

        items[itemIndex].quantity = quantity;
        await setDoc(cartRef, { items }, { merge: true });

        return res.status(200).json({
            status: 'success',
            message: 'Cart quantity updated.',
            data: buildCartResponse(items),
        });
    } catch (error) {
        next(error);
    }
};
