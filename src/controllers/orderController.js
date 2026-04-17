const { db, collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where } = require('../config/firebaseAdmin');

const DEFAULT_USER_ID = 'guest';
const SHIPPING_FEE = 9.99;

const resolveUserId = (req) => req.headers['x-user-id'] || DEFAULT_USER_ID;

const calculateSubtotal = (items) => Number(
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2),
);

const fakePaymentGatewayCharge = ({ paymentMethod, amount }) => {
    const supportedMethods = ['card', 'upi', 'wallet', 'cod'];
    const normalizedMethod = String(paymentMethod || '').toLowerCase();

    if (!supportedMethods.includes(normalizedMethod)) {
        return {
            success: false,
            reason: `Unsupported payment method. Use one of: ${supportedMethods.join(', ')}`,
        };
    }

    if (amount <= 0) {
        return {
            success: false,
            reason: 'Invalid payment amount.',
        };
    }

    return {
        success: true,
        transactionId: `TXN-${Date.now()}`,
    };
};

exports.checkout = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        const { shippingAddress, paymentMethod = 'card' } = req.body;
        
        const cartRef = doc(db, 'carts', String(userId));
        const cartDoc = await getDoc(cartRef);
        const cartItems = cartDoc.exists() ? cartDoc.data().items || [] : [];

        if (!shippingAddress) {
            return res.status(400).json({
                status: 'error',
                message: 'shippingAddress is required.',
            });
        }

        if (cartItems.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Cart is empty.',
            });
        }

        // Verify inventory
        for (const cartItem of cartItems) {
            const productRef = doc(db, 'products', cartItem.productId);
            const productDoc = await getDoc(productRef);

            if (!productDoc.exists()) {
                return res.status(404).json({
                    status: 'error',
                    message: `Product ${cartItem.productId} no longer exists.`,
                });
            }
            
            const product = productDoc.data();

            if (cartItem.quantity > product.inventory) {
                return res.status(400).json({
                    status: 'error',
                    message: `Insufficient inventory for ${product.name}.`,
                });
            }
        }

        const subtotal = calculateSubtotal(cartItems);
        const total = Number((subtotal + SHIPPING_FEE).toFixed(2));
        const paymentResult = fakePaymentGatewayCharge({ paymentMethod, amount: total });

        if (!paymentResult.success) {
            return res.status(400).json({
                status: 'error',
                message: paymentResult.reason,
            });
        }

        // Deduct inventory
        const batch = writeBatch(db);
        for (const cartItem of cartItems) {
            const productRef = doc(db, 'products', cartItem.productId);
            const docSnap = await getDoc(productRef);
            const product = docSnap.data();
            batch.update(productRef, { inventory: product.inventory - cartItem.quantity });
        }

        const newOrderRef = doc(collection(db, 'orders'));
        const orderId = newOrderRef.id;

        const order = {
            orderId,
            userId,
            status: 'placed',
            items: cartItems.map((item) => ({ ...item })),
            shippingAddress,
            paymentMethod,
            paymentTransactionId: paymentResult.transactionId,
            subtotal,
            shippingFee: SHIPPING_FEE,
            total,
            createdAt: new Date().toISOString(),
        };

        batch.set(newOrderRef, order);
        
        // Clear cart
        batch.set(cartRef, { items: [] });
        
        await batch.commit();

        return res.status(201).json({
            status: 'success',
            message: 'Order placed successfully.',
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

exports.getOrderHistory = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        const q = query(collection(db, 'orders'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        let userOrders = [];
        snapshot.forEach(docSnap => userOrders.push(docSnap.data()));

        userOrders = userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            status: 'success',
            count: userOrders.length,
            data: userOrders,
        });
    } catch (error) {
        next(error);
    }
};
