const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Data storage paths
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const itemsFile = path.join(dataDir, 'items.json');
const ordersFile = path.join(dataDir, 'orders.json');

// Initialize data directory and files
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const initFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
};

initFile(usersFile);
initFile(itemsFile);
initFile(ordersFile);

// Helper functions
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ==================== AUTH ====================

app.post('/api/auth/signup', (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let users = readJSON(usersFile);

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      password, // In production, hash this with bcryptjs
      role: role || 'customer',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON(usersFile, users);

    res.json({ 
      success: true, 
      message: 'Account created successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const users = readJSON(usersFile);
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ITEMS/PRODUCTS ====================

app.get('/api/items', (req, res) => {
  try {
    const items = readJSON(itemsFile);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/items', (req, res) => {
  const { name, price, stock, vendorId, vendorName } = req.body;

  if (!name || !price || !stock || !vendorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let items = readJSON(itemsFile);

    const newItem = {
      id: Date.now().toString(),
      name,
      price: Number(price),
      stock: Number(stock),
      vendorId,
      vendorName: vendorName || 'Local Vendor',
      createdAt: new Date().toISOString()
    };

    items.push(newItem);
    writeJSON(itemsFile, items);

    res.json({ success: true, message: 'Product added', item: newItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS ====================

app.get('/api/orders', (req, res) => {
  const { buyerId, vendorId } = req.query;

  try {
    let orders = readJSON(ordersFile);

    if (buyerId) {
      orders = orders.filter(o => o.buyerId === buyerId);
    }
    if (vendorId) {
      orders = orders.filter(o => o.vendorId === vendorId);
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', (req, res) => {
  const { itemId, itemName, qty, amount, total, buyerId, buyerName, vendorId, vendorName, paymentMethod, paymentStatus } = req.body;

  if (!itemId || !qty || !buyerId || !vendorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let orders = readJSON(ordersFile);

    const newOrder = {
      id: Date.now().toString(),
      itemId,
      itemName,
      qty: Number(qty),
      amount: Number(amount),
      total: Number(total),
      buyerId,
      buyerName: buyerName || 'Customer',
      vendorId,
      vendorName: vendorName || 'Vendor',
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || 'pending',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    writeJSON(ordersFile, orders);

    res.json({ success: true, message: 'Order placed', order: newOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status required' });
  }

  try {
    let orders = readJSON(ordersFile);
    const order = orders.find(o => o.id === id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    writeJSON(ordersFile, orders);

    res.json({ success: true, message: 'Order updated', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ZenMeat backend is running' });
});

app.listen(PORT, () => {
  console.log(`ZenMeat backend running on http://localhost:${PORT}`);
  console.log(`Data stored in ${dataDir}`);
});
