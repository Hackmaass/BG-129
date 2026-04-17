const { db } = require('../config/firebaseAdmin');
const { products } = require('./store');

async function seedProducts() {
    try {
        console.log("Starting DB Seed...");
        const batch = db.batch();
        const productsRef = db.collection('products');

        products.forEach(product => {
            // Document ID as string based on item ID to avoid duplicates if run multiple times
            const docRef = productsRef.doc(product.id.toString());
            batch.set(docRef, product);
        });

        await batch.commit();
        console.log("✅ Successfully seeded products to Firestore!");
    } catch (error) {
        console.error("❌ Error seeding products:", error);
    }
}

seedProducts();
