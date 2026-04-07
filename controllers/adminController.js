const storage = require('../storage');
const Item = require('../models/Item');

const ACTIVE_QUEUE_STATUSES = ['pending', 'confirmed', 'received', 'preparing'];
const ORDER_STATUSES = ['pending', 'received', 'preparing', 'ready', 'delivered', 'cancelled'];
const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

const getOrderDate = (order) => {
  const rawValue = order.createdAt || order.pickupTime || order.updatedAt || order.date;
  const parsed = rawValue ? new Date(rawValue) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const getActiveSalesOrders = (orders) => orders.filter((order) => order.status !== 'cancelled');

const buildAnalytics = (orders, items) => {
  const itemNameById = new Map(items.map((item) => [Number(item.id), item.name]));
  const weekdaySales = new Array(7).fill(0);
  const hourlyOrders = new Array(24).fill(0);
  const itemPopularityMap = new Map();

  getActiveSalesOrders(orders).forEach((order) => {
    const orderDate = getOrderDate(order);
    if (orderDate) {
      const jsDay = orderDate.getDay();
      const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1;
      weekdaySales[weekdayIndex] += Number(order.totalPrice || 0);
      hourlyOrders[orderDate.getHours()] += 1;
    }

    (order.items || []).forEach((entry) => {
      const itemId = Number(entry.id);
      const itemName = itemNameById.get(itemId) || entry.name || `Item #${itemId}`;
      const quantity = Math.max(1, Number(entry.quantity) || 1);
      itemPopularityMap.set(itemName, (itemPopularityMap.get(itemName) || 0) + quantity);
    });
  });

  const topItems = [...itemPopularityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const peakHourCount = Math.max(...hourlyOrders, 0);
  const peakHourIndex = hourlyOrders.findIndex((count) => count === peakHourCount);
  const busiestDayAmount = Math.max(...weekdaySales, 0);
  const busiestDayIndex = weekdaySales.findIndex((amount) => amount === busiestDayAmount);

  return {
    salesByWeekday: {
      labels: WEEKDAY_LABELS,
      values: weekdaySales.map((value) => Math.round(value))
    },
    itemPopularity: {
      labels: topItems.map(([label]) => label),
      values: topItems.map(([, value]) => value)
    },
    ordersByHour: {
      labels: HOUR_LABELS,
      values: hourlyOrders
    },
    highlights: {
      busiestDay: busiestDayIndex >= 0 ? WEEKDAY_LABELS[busiestDayIndex] : 'No data yet',
      busiestDaySales: Math.round(busiestDayAmount),
      peakHour: peakHourIndex >= 0 ? HOUR_LABELS[peakHourIndex] : 'No data yet',
      peakHourOrders: peakHourCount,
      topItem: topItems[0] ? topItems[0][0] : 'No orders yet',
      topItemCount: topItems[0] ? topItems[0][1] : 0
    }
  };
};

const sortByPickupTime = (orders) =>
  [...orders].sort((a, b) => {
    const first = a.pickupTime ? new Date(a.pickupTime).getTime() : Number.MAX_SAFE_INTEGER;
    const second = b.pickupTime ? new Date(b.pickupTime).getTime() : Number.MAX_SAFE_INTEGER;
    return first - second;
  });

const resolveImagePath = (req, fallbackImage = '/images/kundu-cafe-logo.svg') => {
  if (req.file) {
    return `/images/${req.file.filename}`;
  }

  if (req.body.image && req.body.image.trim()) {
    return req.body.image.trim();
  }

  return fallbackImage;
};

const formatLastSeen = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
};

const buildUserManagement = (users, liveUserIds) => {
  const normalizedUsers = users
    .map((user) => ({
      ...user,
      isActive: user.isActive !== false,
      isLive: liveUserIds.has(Number(user.id)),
      lastSeenLabel: formatLastSeen(user.lastSeenAt || user.createdAt),
      walletBalance: Number(user.walletBalance || 0)
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.username.localeCompare(b.username);
    });

  return {
    users: normalizedUsers,
    summary: {
      totalUsers: normalizedUsers.length,
      activeUsers: normalizedUsers.filter((user) => user.isActive).length,
      inactiveUsers: normalizedUsers.filter((user) => !user.isActive).length,
      liveUsers: normalizedUsers.filter((user) => user.isLive).length
    }
  };
};

const buildDashboardPayload = async (liveUserIds = new Set()) => {
  const [orders, items, users] = await Promise.all([storage.getOrders(), storage.getItems(), storage.getUsers()]);

  const activeOrders = sortByPickupTime(
    orders.filter((order) => ACTIVE_QUEUE_STATUSES.includes(order.status))
  );
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
  const menuItems = [...items].sort((a, b) => {
    if (a.category === b.category) return a.name.localeCompare(b.name);
    return a.category.localeCompare(b.category);
  });
  const userManagement = buildUserManagement(users, liveUserIds);

  return {
    activeOrders,
    recentOrders,
    menuItems,
    userManagement,
    analytics: buildAnalytics(orders, items),
    stats: {
      activeOrders: activeOrders.length,
      readyOrders: orders.filter((order) => order.status === 'ready').length,
      outOfStockItems: items.filter((item) => item.isOutOfStock || item.quantity <= 0).length,
      totalItems: items.length
    }
  };
};

exports.getDashboard = async (req, res) => {
  try {
    const payload = await buildDashboardPayload(new Set(req.app.locals.liveUserSockets?.keys() || []));
    res.render('admin-dashboard', {
      ...payload,
      user: res.locals.user,
      message: req.query.message || null,
      error: req.query.error || null,
      orderStatuses: ORDER_STATUSES
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).send('Error loading admin dashboard');
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const payload = await buildDashboardPayload(new Set(req.app.locals.liveUserSockets?.keys() || []));
    res.json(payload);
  } catch (error) {
    console.error('Error loading admin dashboard data:', error);
    res.status(500).json({ error: 'Error loading dashboard data' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const targetUser = await storage.findUserById(userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Admin accounts cannot be deactivated here' });
    }

    const updatedUser = await storage.updateUserById(userId, {
      isActive: targetUser.isActive === false,
      lastSeenAt: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('userStatusUpdated', { user: updatedUser });
      io.to(`user-${userId}`).emit('broadcast', {
        title: updatedUser.isActive ? 'Account Reactivated' : 'Account Deactivated',
        message: updatedUser.isActive
          ? 'Your Kundu Cafe account has been reactivated.'
          : 'Your Kundu Cafe account has been deactivated by the admin.'
      });
    }

    if (updatedUser.isActive === false) {
      const liveMap = req.app.locals.liveUserSockets;
      if (liveMap) {
        liveMap.delete(userId);
      }
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Could not update user status' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await storage.updateOrderById(orderId, {
      status,
      updatedAt: new Date()
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('orderStatusUpdated', { orderId, status, order });
      io.to(`user-${order.userId}`).emit('orderUpdate', { orderId, status, order });
      io.emit('orderStatusUpdated', { orderId, status, order });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Error updating order status' });
  }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Broadcast message is required' });
    }

    const payload = {
      title: title && title.trim() ? title.trim() : 'Cafe Notice',
      message: message.trim(),
      sentAt: new Date().toISOString()
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast', payload);
    }

    res.json({ success: true, payload });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Could not send broadcast' });
  }
};

exports.toggleStock = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const item = await storage.findItemById(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updated = await storage.updateItemById(itemId, {
      isOutOfStock: !(item.isOutOfStock || item.quantity <= 0)
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('inventoryUpdated', { item: updated });
      io.emit('inventoryUpdated', { item: updated });
    }

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error toggling stock:', error);
    res.status(500).json({ error: 'Error toggling stock' });
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    const { name, category, subcategory, price, dietary, description, quantity, prepTime } = req.body;
    const parsedPrice = Number(price);
    const parsedQuantity = Math.max(0, Number(quantity) || 0);
    const parsedPrepTime = Math.max(1, Number(prepTime) || 5);

    if (!name || !category || !price) {
      return res.redirect('/admin?error=Please provide name, category, and price');
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.redirect('/admin?error=Please provide a valid price');
    }

    const nextId = await storage.getNextNumericId(Item);
    const created = await storage.createItem({
      id: nextId,
      name: name.trim(),
      category: category.trim(),
      subcategory: (subcategory || '').trim(),
      price: parsedPrice,
      dietary: dietary || 'Veg',
      description: (description || '').trim(),
      image: resolveImagePath(req),
      quantity: parsedQuantity,
      prepTime: parsedPrepTime,
      popularity: 0,
      isOutOfStock: parsedQuantity <= 0
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('menuUpdated', { item: created, action: 'created' });
      io.emit('menuUpdated', { item: created, action: 'created' });
    }

    res.redirect('/admin?message=Menu item created');
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.redirect('/admin?error=Could not create menu item');
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { name, category, subcategory, price, dietary, description, quantity, prepTime } = req.body;

    const existing = await storage.findItemById(itemId);
    if (!existing) {
      return res.redirect('/admin?error=Menu item not found');
    }

    const parsedPrice = Number(price);
    const parsedQuantity = Math.max(0, Number(quantity) || 0);
    const parsedPrepTime = Math.max(1, Number(prepTime) || existing.prepTime || 5);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.redirect('/admin?error=Please provide a valid price');
    }

    const updated = await storage.updateItemById(itemId, {
      name: (name || existing.name).trim(),
      category: (category || existing.category).trim(),
      subcategory: (subcategory || '').trim(),
      price: parsedPrice,
      dietary: dietary || existing.dietary,
      description: (description || '').trim(),
      image: resolveImagePath(req, existing.image),
      quantity: parsedQuantity,
      prepTime: parsedPrepTime,
      isOutOfStock: parsedQuantity <= 0
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('menuUpdated', { item: updated, action: 'updated' });
      io.emit('menuUpdated', { item: updated, action: 'updated' });
    }

    res.redirect('/admin?message=Menu item updated');
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.redirect('/admin?error=Could not update menu item');
  }
};
