# ZenMeat - Local Backend Setup

ZenMeat is now using a local Node.js Express backend instead of Firebase. This allows the app to work without Firestore permission issues.

## Quick Start

### 1. Start the Backend
Double-click `start-backend.bat` or run in terminal:

```bash
cd backend
npm install
npm start
```

The backend will run on `http://localhost:3001`

### 2. Start the Frontend Server
In another terminal, run:

```bash
cd path/to/ZenMeat
python -m http.server 8000
```

Or use the `serve-local.ps1` script in PowerShell.

The frontend will run on `http://localhost:8000`

### 3. Access the App
Open your browser and go to: `http://localhost:8000`

## How It Works

- **Frontend** (`index.html`, `app.js`, `styles.css`): React-like vanilla JS app
- **Backend** (`backend/server.js`): Express API server
- **Adapter** (`backend-adapter.js`): Converts Firebase API calls to local HTTP requests
- **Storage** (`backend/data/`): JSON files store users, items, and orders

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Products
- `GET /api/items` - List all products
- `POST /api/items` - Add new product (vendor only)

### Orders
- `GET /api/orders` - Get orders (filtered by buyerId or vendorId)
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order status

### Health Check
- `GET /api/health` - Server health check

## Features

✅ User signup and login
✅ Customer browsing products
✅ Vendor adding products
✅ Order placement and tracking
✅ Order status updates
✅ Local data persistence (JSON files)

## Testing

### Signup
1. Full Name: John Doe
2. Email: john@example.com (unique email)
3. Phone: 9999999999
4. Password: password123
5. Role: Customer
6. Click "Create Account"

### Login
1. Email: john@example.com
2. Password: password123
3. Click "Login"

## File Structure

```
ZenMeat/
├── index.html           # Main HTML
├── app.js              # Frontend logic
├── styles.css          # Styling
├── backend-adapter.js  # Firebase → Local API bridge
├── backend/
│   ├── server.js       # Express API server
│   ├── package.json    # Node dependencies
│   └── data/           # JSON data storage
├── start-backend.bat   # Windows startup script
└── serve-local.ps1     # PowerShell server script
```

## Notes

- Data is stored in `backend/data/` as JSON files
- No database setup required
- Works on localhost and local network
- For production, add real authentication (bcrypt) and database

