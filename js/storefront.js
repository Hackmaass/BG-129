import { auth } from './auth-logic.js';

const API_BASE_URL = 'http://localhost:5000/api';
const USER_ID_KEY = 'forgecart_user_id';
const SELECTED_PRODUCT_KEY = 'forgecart_selected_product_id';

const ensureUserId = () => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = `guest-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
};

const request = async (path, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': ensureUserId(),
        ...(options.headers || {}),
    };

    if (auth && auth.currentUser) {
        try {
            const token = await auth.currentUser.getIdToken(true);
            headers['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            console.error("Failed to get auth token", error);
        }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    return data;
};

const formatPrice = (value) => `$${Number(value).toFixed(2)}`;

const renderIndexPage = async () => {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    let allProducts = [];

    const populateCategories = (products) => {
        const categories = [...new Set(products.map((p) => p.category))];
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach((category) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    };

    const renderProducts = (products) => {
        productGrid.innerHTML = '';

        if (!products.length) {
            productGrid.innerHTML = '<p style="color: var(--text-muted);">No products match your filter.</p>';
            return;
        }

        products.forEach((product) => {
            const card = document.createElement('div');
            card.className = 'glass product-card';
            card.innerHTML = `
                <a href="product.html?id=${product.id}" class="product-link" style="text-decoration:none;">
                    <div class="product-img-wrapper">
                        <img src="assets/images/hoodie.png" alt="${product.name}" class="product-img">
                    </div>
                </a>
                <div class="product-category"><i class="fas fa-tag" style="font-size:0.7rem; margin-right:4px;"></i> ${product.category}</div>
                <a href="product.html?id=${product.id}" class="product-link" style="text-decoration:none;">
                    <h3 class="product-title">${product.name}</h3>
                </a>
                <div class="product-footer">
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <button class="btn-add-circle" title="Deploy to Cart" data-product-id="${product.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;

            card.querySelectorAll('.product-link').forEach((link) => {
                link.addEventListener('click', () => {
                    localStorage.setItem(SELECTED_PRODUCT_KEY, String(product.id));
                });
            });

            card.querySelector('.btn-add-circle').addEventListener('click', async () => {
                try {
                    await request('/cart/add', {
                        method: 'POST',
                        body: JSON.stringify({ productId: product.id, quantity: 1 }),
                    });
                    alert(`${product.name} added to cart.`);
                } catch (error) {
                    alert(error.message);
                }
            });

            productGrid.appendChild(card);
        });
    };

    const applyFilters = () => {
        const searchValue = searchInput.value.trim().toLowerCase();
        const selectedCategory = categoryFilter.value;

        const filtered = allProducts.filter((product) => {
            const matchesSearch = !searchValue
                || product.name.toLowerCase().includes(searchValue)
                || product.description.toLowerCase().includes(searchValue);
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        renderProducts(filtered);
    };

    try {
        const response = await request('/products');
        allProducts = response.data || [];
        populateCategories(allProducts);
        renderProducts(allProducts);
    } catch (error) {
        productGrid.innerHTML = `<p style="color:#ff6b6b;">${error.message}</p>`;
        return;
    }

    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
};

const renderProductPage = async () => {
    const container = document.getElementById('product-details-container');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id') || localStorage.getItem(SELECTED_PRODUCT_KEY) || '1';

    try {
        const response = await request(`/products/${requestedId}`);
        const product = response.data;
        localStorage.setItem(SELECTED_PRODUCT_KEY, String(product.id));

        container.innerHTML = `
            <div class="product-details">
                <div class="product-img-wrapper flex items-center justify-center">
                    <img src="assets/images/hoodie.png" alt="${product.name}" class="product-img" style="width: 100%; border-radius:16px;">
                </div>
                <div class="product-info glass" style="padding: 40px; text-align: left; height: 100%; display: flex; flex-direction: column; justify-content: center;">
                    <div class="product-category" style="margin-bottom: 15px;"><i class="fas fa-fingerprint"></i> ${product.category}</div>
                    <h1>${product.name}</h1>
                    <div class="price">
                        ${formatPrice(product.price)}
                        <span class="badge"><i class="fas fa-check-circle"></i> ${product.inventory > 0 ? 'In Stock' : 'Out of Stock'}</span>
                    </div>
                    <p class="desc">${product.description}</p>
                    <ul class="feature-list">
                        <li><i class="fas fa-star"></i> Rating ${product.rating}</li>
                        <li><i class="fas fa-boxes"></i> Inventory ${product.inventory}</li>
                        <li><i class="fas fa-shipping-fast"></i> Fast dispatch available</li>
                    </ul>
                    <div class="action-row">
                        <button class="btn" id="add-to-cart-btn" style="flex: 1; padding: 16px; font-size: 1.1rem;" ${product.inventory === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-arrow-down"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;

        const addButton = document.getElementById('add-to-cart-btn');
        if (addButton) {
            addButton.addEventListener('click', async () => {
                try {
                    await request('/cart/add', {
                        method: 'POST',
                        body: JSON.stringify({ productId: product.id, quantity: 1 }),
                    });
                    alert('Added to cart.');
                } catch (error) {
                    alert(error.message);
                }
            });
        }
    } catch (error) {
        container.innerHTML = `<p style="color:#ff6b6b;">${error.message}</p>`;
    }
};

const renderCartPage = async () => {
    const cartItemsList = document.getElementById('cart-items-list');
    if (!cartItemsList) return;

    const summaryTotal = document.getElementById('summary-total-amt');
    const checkoutButton = document.getElementById('checkout-btn');

    const refreshCart = async () => {
        const response = await request('/cart');
        const cart = response.data;
        summaryTotal.textContent = formatPrice(cart.subtotal);

        cartItemsList.innerHTML = '';
        if (!cart.items.length) {
            cartItemsList.innerHTML = '<p style="color: var(--text-muted);">Your cart is empty.</p>';
            checkoutButton.disabled = true;
            return;
        }

        checkoutButton.disabled = false;

        cart.items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'glass cart-item';
            row.innerHTML = `
                <img src="assets/images/hoodie.png" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-qty-ctrl">
                    <button class="qty-btn" data-action="decrease"><i class="fas fa-minus"></i></button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" data-action="increase"><i class="fas fa-plus"></i></button>
                </div>
                <div class="cart-item-total">${formatPrice(item.lineTotal)}</div>
                <button class="icon-btn" data-action="remove">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            row.querySelector('[data-action="increase"]').addEventListener('click', async () => {
                try {
                    await request(`/cart/item/${item.productId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ quantity: item.quantity + 1 }),
                    });
                    await refreshCart();
                } catch (error) {
                    alert(error.message);
                }
            });

            row.querySelector('[data-action="decrease"]').addEventListener('click', async () => {
                if (item.quantity === 1) return;
                try {
                    await request(`/cart/item/${item.productId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ quantity: item.quantity - 1 }),
                    });
                    await refreshCart();
                } catch (error) {
                    alert(error.message);
                }
            });

            row.querySelector('[data-action="remove"]').addEventListener('click', async () => {
                await request(`/cart/remove/${item.productId}`, { method: 'DELETE' });
                await refreshCart();
            });

            cartItemsList.appendChild(row);
        });
    };

    checkoutButton.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });

    try {
        await refreshCart();
    } catch (error) {
        cartItemsList.innerHTML = `<p style="color:#ff6b6b;">${error.message}</p>`;
    }
};

const renderCheckoutPage = async () => {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    const itemsSummary = document.getElementById('checkout-items-summary');
    const checkoutTotal = document.getElementById('checkout-total');
    const submitButton = form.querySelector('button[type="button"]');

    const loadSummary = async () => {
        const response = await request('/cart');
        const cart = response.data;

        itemsSummary.innerHTML = '';
        if (!cart.items.length) {
            itemsSummary.innerHTML = '<p style="color: var(--text-muted);">No items in cart.</p>';
            checkoutTotal.textContent = formatPrice(0);
            submitButton.disabled = true;
            return;
        }

        submitButton.disabled = false;
        cart.items.forEach((item) => {
            const line = document.createElement('div');
            line.className = 'flex justify-between items-center mb-2';
            line.style.fontSize = '0.95rem';
            line.innerHTML = `
                <span class="text-muted"><i class="fas fa-layer-group" style="font-size: 0.8rem; margin-right: 5px; color: var(--primary);"></i> ${item.name}
                    <span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; margin-left: 5px;">x${item.quantity}</span>
                </span>
                <span>${formatPrice(item.lineTotal)}</span>
            `;
            itemsSummary.appendChild(line);
        });

        const finalTotal = Number(cart.subtotal) + 9.99;
        checkoutTotal.textContent = formatPrice(finalTotal);
    };

    submitButton.addEventListener('click', async () => {
        const fullName = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('address').value.trim();

        if (!fullName || !email || !address) {
            alert('Please complete all checkout fields.');
            return;
        }

        submitButton.disabled = true;
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            await request('/orders/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    shippingAddress: `${fullName}, ${email}, ${address}`,
                    paymentMethod: 'card',
                }),
            });
            alert('Order placed successfully.');
            window.location.href = 'orders.html';
        } catch (error) {
            alert(error.message);
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });

    try {
        await loadSummary();
    } catch (error) {
        itemsSummary.innerHTML = `<p style="color:#ff6b6b;">${error.message}</p>`;
    }
};

const renderOrdersPage = async () => {
    const container = document.getElementById('order-history-container');
    if (!container) return;

    try {
        const response = await request('/orders');
        const orders = response.data || [];

        if (!orders.length) {
            container.innerHTML = '<p style="color: var(--text-muted);">No orders yet.</p>';
            return;
        }

        const rows = orders.map((order) => `
            <tr>
                <td style="font-family: monospace; font-size: 0.95rem; color: var(--text-main);"><strong>${order.orderId}</strong></td>
                <td style="color: var(--text-muted);">${new Date(order.createdAt).toLocaleString()}</td>
                <td><span style="background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 20px; font-size: 0.85rem;">${order.items.length} item(s)</span></td>
                <td style="color: var(--primary); font-weight:700;">${formatPrice(order.total)}</td>
                <td><span class="status-badge"><i class="fas fa-check-circle"></i> ${order.status}</span></td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="table-responsive">
                <table class="glass" style="margin-top: 0;">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Timestamp</th>
                            <th>Assets</th>
                            <th>Total Resource</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<p style="color:#ff6b6b;">${error.message}</p>`;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    ensureUserId();
    await renderIndexPage();
    await renderProductPage();
    await renderCartPage();
    await renderCheckoutPage();
    await renderOrdersPage();
});
