const storage = require('../storage');

const LOW_BALANCE_THRESHOLD = 150;

/**
 * Wallet Controller
 */

// Get wallet page
exports.getWallet = async (req, res) => {
  try {
    const users = await storage.getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const transactions = (await storage.getTransactions())
      .filter(t => t.userId === user.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const spentThisMonth = transactions
      .filter((transaction) =>
        transaction.type === 'purchase' &&
        new Date(transaction.date).getMonth() === new Date().getMonth() &&
        new Date(transaction.date).getFullYear() === new Date().getFullYear()
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const topUpsThisMonth = transactions
      .filter((transaction) =>
        transaction.type === 'top-up' &&
        new Date(transaction.date).getMonth() === new Date().getMonth() &&
        new Date(transaction.date).getFullYear() === new Date().getFullYear()
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    res.render('wallet', {
      user,
      transactions,
      message: req.query.message || null,
      error: req.query.error || null,
      lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
      isLowBalance: Number(user.walletBalance || 0) < LOW_BALANCE_THRESHOLD,
      spentThisMonth,
      topUpsThisMonth
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).send('Error fetching wallet');
  }
};

// Top up wallet
exports.topUpWallet = async (req, res) => {
  try {
    const { amount, paymentMethod, reference } = req.body;
    const topUpAmount = parseInt(amount);

    if (!topUpAmount || topUpAmount <= 0) {
      return res.redirect('/wallet?error=Please enter a valid amount');
    }

    if (!paymentMethod || !['upi', 'card'].includes(paymentMethod)) {
      return res.redirect('/wallet?error=Please choose UPI or Card for top-up');
    }

    const users = await storage.getUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.walletBalance += topUpAmount;
    
    const transactions = await storage.getTransactions();
    const newTransaction = {
      id: Date.now(),
      userId: user.id,
      type: 'top-up',
      amount: topUpAmount,
      description: `Wallet top-up via ${paymentMethod.toUpperCase()}`,
      paymentMethod,
      reference: (reference || '').trim(),
      date: new Date()
    };
    transactions.push(newTransaction);
    
    await storage.saveUsers(users);
    await storage.saveTransactions(transactions);

    res.redirect('/wallet?message=Wallet topped up successfully');
  } catch (error) {
    console.error('Error topping up wallet:', error);
    res.status(500).send('Error topping up wallet');
  }
};
