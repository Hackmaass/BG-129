const { initializeApp } = require('firebase/app');
const { getFirestore, doc, writeBatch } = require('firebase/firestore');
const { products } = require('./store');

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

async function seedProducts() {
    try {
        console.log("Starting DB Seed...");
        const batch = writeBatch(db);

        products.forEach(product => {
            const docRef = doc(db, 'products', product.id.toString());
            batch.set(docRef, product);
        });

        await batch.commit();
        console.log("✅ Successfully seeded products to Firestore!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding products:", error);
        process.exit(1);
    }
}

seedProducts();
