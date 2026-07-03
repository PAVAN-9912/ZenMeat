# ZenMeat 🥩

A local meat ordering application built with vanilla JavaScript frontend and Python backend. Order fresh meat from local vendors with a simple, intuitive interface.

## 🚀 Features

- **User Authentication**
  - Customer and Vendor account types
  - Secure signup and login
  - Profile management

- **Customer Features**
  - Browse products from local vendors
  - Search for meat products
  - Place orders with multiple payment methods
  - Track order status
  - View order history

- **Vendor Features**
  - Add and manage products
  - View incoming customer orders
  - Update order status
  - Track inventory

## 📋 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Python (http.server module)
- **Database:** JSON files
- **API:** RESTful HTTP API

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.x
- Git
- Modern web browser

### Quick Start

1. **Navigate to project directory:**
   ```bash
   cd "c:\Users\PAVAN S\OneDrive\Desktop\ZenMeat"
   ```

2. **Start Backend Server** (Terminal 1):
   ```bash
   python backend.py
   ```
   Backend runs on: `http://10.131.173.110:3001`

3. **Start Frontend Server** (Terminal 2):
   ```bash
   python serve-network.py
   ```
   Frontend runs on: `http://10.131.173.110:8000`

4. **Open in Browser:**
   ```
   http://10.131.173.110:8000/
   ```

## 🔗 Network Access

Access the app from any device on your network:
- **Local:** `http://127.0.0.1:8000/`
- **Network:** `http://10.131.173.110:8000/`
- **Backend API:** `http://10.131.173.110:3001/`

## 📂 Project Structure

```
ZenMeat/
├── index.html           # Main HTML structure
├── app.js              # Core application logic
├── styles.css          # Styling
├── backend.py          # Python HTTP server & API
├── backend-adapter.js  # Firebase-compatible adapter
├── serve-network.py    # Frontend server
├── data/               # JSON database files
│   ├── users.json
│   ├── items.json
│   └── orders.json
├── dist/               # Static build
└── README.md           # This file
```

## 🔐 Default Test Accounts

### Customer
- **Email:** `user1783069593020@example.com`
- **Password:** `mypassword123`

### Vendor
- **Email:** `vendor1783069634081@example.com`
- **Password:** `vendorpass123`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - User login

### Products
- `GET /api/items` - List all products
- `POST /api/items` - Add new product (vendor)

### Orders
- `GET /api/orders?buyerId=X` - Get customer orders
- `GET /api/orders?vendorId=X` - Get vendor orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status

## 🎯 Features Implemented

✅ User authentication (signup/login)
✅ Role-based access (Customer/Vendor)
✅ Product management
✅ Order placement
✅ Order tracking
✅ Local data persistence
✅ Network accessibility
✅ CORS-enabled API

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Created as a local meat ordering system for community vendors.

---

**Get Started:** Run the commands above and visit `http://10.131.173.110:8000/` to start ordering fresh meat! 🎉
