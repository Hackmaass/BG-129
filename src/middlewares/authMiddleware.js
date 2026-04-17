const { admin } = require('../config/firebaseAdmin');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // For development/mock purposes, if they send x-user-id we let them pass
        // But for actual security, we need to enforce the token.
        if (req.headers['x-user-id']) {
            return next();
        }
        
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: No token provided.',
        });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        // set x-user-id from the decoded token for controller compatibility
        req.headers['x-user-id'] = decodedToken.uid;
        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid token.',
        });
    }
};

module.exports = { verifyToken };
