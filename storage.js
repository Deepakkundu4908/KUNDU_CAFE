const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Order = require('./models/Order');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

const dataDir = path.join(__dirname, 'data');
const itemsPath = path.join(dataDir, 'items.json');
const usersPath = path.join(dataDir, 'users.json');
const ordersPath = path.join(dataDir, 'orders.json');
const transactionsPath = path.join(dataDir, 'transactions.json');

const readSeedFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error reading seed file ${filePath}:`, error);
    }
    return [];
  }
};

const toPlainDocs = (documents) =>
  documents.map((document) => {
    const plain = document.toObject ? document.toObject() : { ...document };
    delete plain._id;
    return plain;
  });

const replaceCollection = async (Model, docs) => {
  await Model.deleteMany({});
  if (docs.length) {
    await Model.insertMany(docs, { ordered: true });
  }
  return docs;
};

const ensureAdminUser = async () => {
  const defaultAdminEmail = 'admin@kunducafe.com';
  const defaultAdminPassword = 'admin4908';
  const hashedPassword = bcrypt.hashSync(defaultAdminPassword, 10);

  let adminUser = await User.findOne({
    $or: [{ role: 'admin' }, { email: defaultAdminEmail }]
  });

  if (!adminUser) {
    adminUser = await User.create({
      id: Date.now(),
      username: 'admin',
      email: defaultAdminEmail,
      collegeEmail: null,
      collegeId: null,
      password: hashedPassword,
      role: 'admin',
      walletBalance: 0,
      isEmailVerified: true
    });
    console.log('Default admin user created.');
    console.log(`Email: ${defaultAdminEmail}`);
    console.log(`Password: ${defaultAdminPassword}`);
    return;
  }

  const needsPasswordUpdate = !adminUser.password || !String(adminUser.password).startsWith('$2');
  const updates = {};

  if (needsPasswordUpdate) {
    updates.password = hashedPassword;
  }
  if (!adminUser.email) {
    updates.email = defaultAdminEmail;
  }
  if (adminUser.role !== 'admin') {
    updates.role = 'admin';
  }
  if (adminUser.collegeEmail !== null) {
    updates.collegeEmail = null;
  }
  if (adminUser.collegeId !== null) {
    updates.collegeId = null;
  }

  if (Object.keys(updates).length > 0) {
    await User.updateOne({ _id: adminUser._id }, { $set: updates });
    console.log('Admin user normalized for MongoDB login.');
  }
};

const seedMongoFromJson = async () => {
  const [itemCount, userCount, orderCount, transactionCount] = await Promise.all([
    Item.countDocuments(),
    User.countDocuments(),
    Order.countDocuments(),
    Transaction.countDocuments()
  ]);

  if (itemCount === 0) {
    const items = readSeedFile(itemsPath);
    if (items.length) {
      await Item.insertMany(items);
      console.log(`Seeded ${items.length} items into MongoDB.`);
    }
  }

  if (userCount === 0) {
    const users = readSeedFile(usersPath).map((user) => {
      const nextUser = { ...user };
      if (!nextUser.password || !String(nextUser.password).startsWith('$2')) {
        nextUser.password = bcrypt.hashSync(nextUser.password || 'changeme123', 10);
      }
      return nextUser;
    });

    if (users.length) {
      await User.insertMany(users);
      console.log(`Seeded ${users.length} users into MongoDB.`);
    }
  }

  if (orderCount === 0) {
    const orders = readSeedFile(ordersPath);
    if (orders.length) {
      await Order.insertMany(orders);
      console.log(`Seeded ${orders.length} orders into MongoDB.`);
    }
  }

  if (transactionCount === 0) {
    const transactions = readSeedFile(transactionsPath);
    if (transactions.length) {
      await Transaction.insertMany(transactions);
      console.log(`Seeded ${transactions.length} transactions into MongoDB.`);
    }
  }

  await ensureAdminUser();
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kundu_cafe';
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  await seedMongoFromJson();
  return mongoose.connection;
};

module.exports = {
  connectDB,

  getItems: async () => Item.find().sort({ id: 1 }).lean(),
  saveItems: async (items) => replaceCollection(Item, items),

  getUsers: async () => User.find().sort({ id: 1 }).lean(),
  saveUsers: async (users) => replaceCollection(User, users),

  getOrders: async () => Order.find().sort({ id: 1 }).lean(),
  saveOrders: async (orders) => replaceCollection(Order, orders),

  getTransactions: async () => Transaction.find().sort({ id: 1 }).lean(),
  saveTransactions: async (transactions) => replaceCollection(Transaction, transactions),

  findUserByEmail: async (email) => User.findOne({ email }).lean(),
  findUserById: async (id) => User.findOne({ id }).lean(),
  findItemById: async (id) => Item.findOne({ id }).lean(),
  findOrderById: async (id) => Order.findOne({ id }).lean(),

  updateUserById: async (id, updates) =>
    User.findOneAndUpdate({ id }, { $set: updates }, { new: true, lean: true }),
  updateItemById: async (id, updates) =>
    Item.findOneAndUpdate({ id }, { $set: updates }, { new: true, lean: true }),
  updateOrderById: async (id, updates) =>
    Order.findOneAndUpdate({ id }, { $set: updates }, { new: true, lean: true }),

  createUser: async (user) => {
    const created = await User.create(user);
    return toPlainDocs([created])[0];
  },
  createItem: async (item) => {
    const created = await Item.create(item);
    return toPlainDocs([created])[0];
  },

  createOrder: async (order) => {
    const created = await Order.create(order);
    return toPlainDocs([created])[0];
  },

  createTransaction: async (transaction) => {
    const created = await Transaction.create(transaction);
    return toPlainDocs([created])[0];
  },

  getNextNumericId: async (Model) => {
    const latest = await Model.findOne().sort({ id: -1 }).lean();
    return latest ? latest.id + 1 : 1;
  },

  replaceCollection
};
