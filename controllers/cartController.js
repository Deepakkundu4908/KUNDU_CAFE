const storage = require('../storage');

/**
 * Cart Controller
 */

// Get cart items
exports.getCart = async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const items = await storage.getItems();
    
    // Enrich cart items with current product details
    const cartWithDetails = cart.map(cartItem => {
      const item = items.find(i => i.id == cartItem.id);
      return {
        ...cartItem,
        name: item ? item.name : 'Unknown Item',
        dietary: item ? item.dietary : 'N/A',
        category: item ? item.category : 'N/A',
        image: item ? item.image : '/images/kundu-cafe-logo.svg',
        prepTime: item ? item.prepTime : null,
        availableQuantity: item ? item.quantity : cartItem.quantity
      };
    });

    const totalItems = cartWithDetails.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartWithDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.render('cart', { 
      cart: cartWithDetails, 
      totalItems, 
      totalPrice, 
      message: req.query.message || null,
      user: res.locals.user 
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).send('Error fetching cart');
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const items = await storage.getItems();
    const item = items.find(i => i.id == itemId);

    if (!item) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/products?error=Item not found');
      }
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.isOutOfStock || item.quantity <= 0) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/products?error=Item is out of stock');
      }
      return res.status(400).json({ error: 'Item is out of stock' });
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItem = req.session.cart.find(ci => ci.id == itemId);
    if (existingItem) {
      existingItem.quantity += parseInt(quantity) || 1;
    } else {
      req.session.cart.push({
        id: itemId,
        quantity: parseInt(quantity) || 1,
        price: item.price,
        name: item.name,
        dietary: item.dietary,
        category: item.category
      });
    }

    const successMessage = `${item.name} added to cart`;

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect(`/cart?message=${encodeURIComponent(successMessage)}`);
    }

    res.json({ success: true, message: successMessage, redirectTo: '/cart' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/products?error=Error adding item to cart');
    }
    res.status(500).json({ error: 'Error adding to cart' });
  }
};

// Update item quantity in cart
exports.updateQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    
    if (!req.session.cart) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/cart');
      }
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const cartItem = req.session.cart.find(ci => ci.id == itemId);
    if (!cartItem) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/cart');
      }
      return res.status(404).json({ error: 'Item not in cart' });
    }

    const qty = parseInt(quantity);
    const items = await storage.getItems();
    const product = items.find(i => i.id == itemId);

    if (qty <= 0) {
      // Remove item if quantity is 0
      req.session.cart = req.session.cart.filter(ci => ci.id != itemId);
    } else if (product && qty > product.quantity) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/cart');
      }
      return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
    } else {
      cartItem.quantity = qty;
    }

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/cart');
    }

    res.json({ success: true, message: 'Quantity updated' });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: 'Error updating quantity' });
  }
};

// Remove item from cart
exports.removeFromCart = (req, res) => {
  try {
    const { itemId } = req.params;
    if (req.session.cart) {
      req.session.cart = req.session.cart.filter(item => item.id != itemId);
    }
    res.redirect('/cart');
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).send('Error removing from cart');
  }
};

// Clear entire cart
exports.clearCart = (req, res) => {
  try {
    req.session.cart = [];
    res.redirect('/cart');
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).send('Error clearing cart');
  }
};
