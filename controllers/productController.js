const storage = require('../storage');

/**
 * Product Controller
 */

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = 8;
    const items = await storage.getItems();
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * perPage;
    const paginatedItems = items.slice(startIndex, startIndex + perPage);

    res.render('products', {
      items: paginatedItems,
      currentPage,
      totalPages,
      totalItems,
      pageSize: perPage,
      basePath: '/products',
      user: res.locals.user
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Error fetching products');
  }
};

// Get products by category and dietary preference
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category, dietary } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = 8;
    let items = await storage.getItems();

    // Filter by category
    if (category && category !== 'All') {
      items = items.filter(item => item.category === category);
    }

    // Filter by dietary preference
    if (dietary && dietary !== 'All') {
      items = items.filter(item => item.dietary === dietary);
    }

    const categories = ['Breakfast', 'Lunch', 'Snacks', 'Drinks'];
    const dietaryOptions = ['Veg', 'Non-Veg'];
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * perPage;
    const paginatedItems = items.slice(startIndex, startIndex + perPage);
    
    // Calculate cart count
    const cart = req.session.cart || [];
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    res.render('menu-browsing', {
      items: paginatedItems,
      categories,
      dietaryOptions,
      selectedCategory: category || 'Breakfast',
      selectedDietary: dietary || 'All',
      currentPage,
      totalPages,
      totalItems,
      pageSize: perPage,
      cartCount,
      user: res.locals.user
    });
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).send('Error filtering products');
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await storage.getItems();
    const item = items.find(i => i.id == id);

    if (!item) {
      return res.status(404).send('Product not found');
    }

    res.render('product-detail', { item, user: res.locals.user });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).send('Error fetching product');
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = 8;
    const items = await storage.getItems();
    const results = items.filter(i => 
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.subcategory.toLowerCase().includes(query.toLowerCase()) ||
      i.description.toLowerCase().includes(query.toLowerCase())
    );

    const totalItems = results.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * perPage;
    const paginatedItems = results.slice(startIndex, startIndex + perPage);

    res.render('products', {
      items: paginatedItems,
      user: res.locals.user,
      searchQuery: query,
      currentPage,
      totalPages,
      totalItems,
      pageSize: perPage,
      basePath: `/products/search?query=${encodeURIComponent(query || '')}`
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).send('Search failed');
  }
};

// Get frequent orders for a user
exports.getFrequentOrders = async (req, res) => {
  try {
    if (!res.locals.user) {
      return res.json([]);
    }

    const orders = await storage.getOrders();
    const userOrders = orders.filter(order => order.userId == res.locals.user.id);
    
    // Count item frequencies
    const itemFrequency = {};
    userOrders.forEach(order => {
      order.items.forEach(item => {
        itemFrequency[item.id] = (itemFrequency[item.id] || 0) + item.quantity;
      });
    });

    // Get top frequent items
    const sortedItems = Object.entries(itemFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => parseInt(id));

    const items = await storage.getItems();
    const frequentItems = items.filter(item => sortedItems.includes(item.id));

    res.json(frequentItems);
  } catch (error) {
    console.error('Error fetching frequent orders:', error);
    res.status(500).json({ error: 'Error fetching frequent orders' });
  }
};
