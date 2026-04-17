const { db } = require('../config/firebaseAdmin');

const parseNumber = (value) => {
    if (value === undefined) {
        return undefined;
    }
    const converted = Number(value);
    return Number.isNaN(converted) ? undefined : converted;
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const {
            q,
            category,
            minPrice,
            maxPrice,
            featured,
            inStock,
            sortBy = 'name',
            sortOrder = 'asc',
        } = req.query;

        // Fetch all products from Firestore
        const productsSnapshot = await db.collection('products').get();
        let products = [];
        productsSnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        const min = parseNumber(minPrice);
        const max = parseNumber(maxPrice);
        const loweredQuery = q ? q.toLowerCase() : '';

        // Client-side filtering (Firestore compound queries can be complex, doing it in memory for now)
        let filtered = products.filter((product) => {
            const matchesQuery = !loweredQuery
                || product.name.toLowerCase().includes(loweredQuery)
                || product.description.toLowerCase().includes(loweredQuery);

            const matchesCategory = !category || product.category.toLowerCase() === category.toLowerCase();
            const matchesMin = min === undefined || product.price >= min;
            const matchesMax = max === undefined || product.price <= max;
            const matchesFeatured = featured === undefined || String(product.featured) === String(featured);
            const matchesInStock = inStock === undefined
                || (String(inStock) === 'true' ? product.inventory > 0 : product.inventory === 0);

            return matchesQuery && matchesCategory && matchesMin && matchesMax && matchesFeatured && matchesInStock;
        });

        const allowedSortFields = ['name', 'price', 'rating', 'inventory', 'category'];
        const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
        const direction = sortOrder === 'desc' ? -1 : 1;

        filtered = filtered.sort((a, b) => {
            if (typeof a[resolvedSortBy] === 'string') {
                return a[resolvedSortBy].localeCompare(b[resolvedSortBy]) * direction;
            }
            return (a[resolvedSortBy] - b[resolvedSortBy]) * direction;
        });

        res.status(200).json({
            status: 'success',
            count: filtered.length,
            data: filtered,
        });
    } catch (error) {
        next(error);
    }
};

exports.getProductById = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const docRef = db.collection('products').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({
                status: 'error',
                message: `Product with id ${id} not found.`,
            });
        }

        return res.status(200).json({
            status: 'success',
            data: { id: doc.id, ...doc.data() },
        });
    } catch (error) {
        next(error);
    }
};

exports.getCategories = async (req, res, next) => {
    try {
        const productsSnapshot = await db.collection('products').get();
        const products = [];
        productsSnapshot.forEach(doc => products.push(doc.data()));
        
        const categories = [...new Set(products.map((product) => product.category))].filter(Boolean).sort();

        res.status(200).json({
            status: 'success',
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

exports.getInventory = async (req, res, next) => {
    try {
        const productsSnapshot = await db.collection('products').get();
        const inventory = [];
        
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            inventory.push({
                id: doc.id,
                name: product.name,
                inventory: product.inventory,
                inStock: product.inventory > 0,
            });
        });

        res.status(200).json({
            status: 'success',
            count: inventory.length,
            data: inventory,
        });
    } catch (error) {
        next(error);
    }
};
