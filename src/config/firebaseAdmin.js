const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, query, where } = require('firebase/firestore');

// Initialize admin for Token Verification (Only requires projectId)
admin.initializeApp({
    projectId: "backforge-eec83"
});

// Initialize client SDK for Firestore Database operations (Requires API Key)
const firebaseConfig = {
  apiKey: "AIzaSyCYfjCMcnIyKSLQPo_t3OCbPgh5q10wmUc",
  authDomain: "backforge-eec83.firebaseapp.com",
  projectId: "backforge-eec83",
  storageBucket: "backforge-eec83.firebasestorage.app",
  messagingSenderId: "580991512320",
  appId: "1:580991512320:web:748f95ad3c53bd4f738de5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { admin, db, collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, query, where };

