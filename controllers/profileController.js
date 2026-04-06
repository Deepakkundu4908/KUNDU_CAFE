const storage = require('../storage');

exports.getProfile = async (req, res) => {
  try {
    const authUser = res.locals.user;
    const userRecord = await storage.findUserById(authUser.id);
    const orders = await storage.getOrders();
    const transactions = await storage.getTransactions();

    const userOrders = orders.filter((order) => Number(order.userId) === Number(authUser.id));
    const userTransactions = transactions.filter((transaction) => Number(transaction.userId) === Number(authUser.id));

    const activeOrders = userOrders.filter((order) => ['pending', 'confirmed', 'received', 'preparing', 'ready'].includes(order.status)).length;
    const totalSpent = userTransactions
      .filter((transaction) => transaction.type === 'purchase')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    res.render('profile', {
      user: userRecord || authUser,
      stats: {
        totalOrders: userOrders.length,
        activeOrders,
        walletBalance: Number((userRecord && userRecord.walletBalance) || 0),
        totalSpent: Math.round(totalSpent)
      }
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Error loading profile');
  }
};
