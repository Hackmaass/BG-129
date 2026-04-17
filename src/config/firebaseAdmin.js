const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

// Check if the service account key exists (Required for Firestore access in Node.js)
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin Initialized successfully.");
} else {
    console.warn("⚠️  WARNING: serviceAccountKey.json not found in src/config/");
    console.warn("⚠️  Firestore calls will fail. Please generate a new private key from Firebase Project Settings > Service Accounts and save it as src/config/serviceAccountKey.json");
    // Fallback initialize without credentials (will fail on actual DB calls but allows app to start)
    admin.initializeApp();
}

const db = admin.firestore();

module.exports = { admin, db };
