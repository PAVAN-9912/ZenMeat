import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime
from io import BytesIO

PORT = 3001
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

USERS_FILE = os.path.join(DATA_DIR, 'users.json')
ITEMS_FILE = os.path.join(DATA_DIR, 'items.json')
ORDERS_FILE = os.path.join(DATA_DIR, 'orders.json')

def init_files():
    for file_path in [USERS_FILE, ITEMS_FILE, ORDERS_FILE]:
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                json.dump([], f)

init_files()

def read_json(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def write_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

class ZenMeatHandler(http.server.BaseHTTPRequestHandler):
    
    def do_GET(self):
        if self.path == '/api/health':
            self.send_json({'status': 'ok', 'message': 'ZenMeat backend is running'})
        elif self.path.startswith('/api/items'):
            items = read_json(ITEMS_FILE)
            self.send_json(items)
        elif self.path.startswith('/api/orders'):
            buyer_id = self.get_query_param('buyerId')
            vendor_id = self.get_query_param('vendorId')
            orders = read_json(ORDERS_FILE)
            if buyer_id:
                orders = [o for o in orders if o.get('buyerId') == buyer_id]
            if vendor_id:
                orders = [o for o in orders if o.get('vendorId') == vendor_id]
            self.send_json(orders)
        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        data = json.loads(body) if body else {}

        if self.path == '/api/auth/signup':
            self.handle_signup(data)
        elif self.path == '/api/auth/login':
            self.handle_login(data)
        elif self.path == '/api/items':
            self.handle_add_item(data)
        elif self.path == '/api/orders':
            self.handle_create_order(data)
        else:
            self.send_error(404)

    def do_PUT(self):
        if '/api/orders/' in self.path:
            order_id = self.path.split('/')[-1]
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            self.handle_update_order(order_id, data)
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_json(self, error, status=400):
        self.send_json({'error': error}, status)

    def get_query_param(self, param):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        return params.get(param, [None])[0]

    def handle_signup(self, data):
        name = data.get('name', '')
        email = data.get('email', '')
        phone = data.get('phone', '')
        password = data.get('password', '')
        role = data.get('role', 'customer')

        if not name or not email or not password:
            return self.send_error_json('Missing required fields', 400)

        users = read_json(USERS_FILE)
        if any(u['email'] == email for u in users):
            return self.send_error_json('Email already registered', 400)

        new_user = {
            'id': str(int(datetime.now().timestamp() * 1000)),
            'name': name,
            'email': email,
            'phone': phone,
            'password': password,
            'role': role,
            'createdAt': datetime.now().isoformat()
        }

        users.append(new_user)
        write_json(USERS_FILE, users)

        self.send_json({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'id': new_user['id'],
                'name': new_user['name'],
                'email': new_user['email'],
                'role': new_user['role']
            }
        })

    def handle_login(self, data):
        email = data.get('email', '')
        password = data.get('password', '')

        if not email or not password:
            return self.send_error_json('Email and password required', 400)

        users = read_json(USERS_FILE)
        user = next((u for u in users if u['email'] == email and u['password'] == password), None)

        if not user:
            return self.send_error_json('Invalid email or password', 401)

        self.send_json({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        })

    def handle_add_item(self, data):
        name = data.get('name', '')
        price = data.get('price', 0)
        stock = data.get('stock', 0)
        vendor_id = data.get('vendorId', '')
        vendor_name = data.get('vendorName', 'Local Vendor')

        if not name or not price or not stock or not vendor_id:
            return self.send_error_json('Missing required fields', 400)

        items = read_json(ITEMS_FILE)
        new_item = {
            'id': str(int(datetime.now().timestamp() * 1000)),
            'name': name,
            'price': float(price),
            'stock': float(stock),
            'vendorId': vendor_id,
            'vendorName': vendor_name,
            'createdAt': datetime.now().isoformat()
        }

        items.append(new_item)
        write_json(ITEMS_FILE, items)

        self.send_json({
            'success': True,
            'message': 'Product added',
            'item': new_item
        })

    def handle_create_order(self, data):
        item_id = data.get('itemId', '')
        item_name = data.get('itemName', '')
        qty = data.get('qty', 0)
        amount = data.get('amount', 0)
        total = data.get('total', 0)
        buyer_id = data.get('buyerId', '')
        buyer_name = data.get('buyerName', 'Customer')
        vendor_id = data.get('vendorId', '')
        vendor_name = data.get('vendorName', 'Vendor')
        payment_method = data.get('paymentMethod', 'cod')
        payment_status = data.get('paymentStatus', 'pending')

        if not item_id or not qty or not buyer_id or not vendor_id:
            return self.send_error_json('Missing required fields', 400)

        orders = read_json(ORDERS_FILE)
        new_order = {
            'id': str(int(datetime.now().timestamp() * 1000)),
            'itemId': item_id,
            'itemName': item_name,
            'qty': float(qty),
            'amount': float(amount),
            'total': float(total),
            'buyerId': buyer_id,
            'buyerName': buyer_name,
            'vendorId': vendor_id,
            'vendorName': vendor_name,
            'paymentMethod': payment_method,
            'paymentStatus': payment_status,
            'status': 'confirmed',
            'createdAt': datetime.now().isoformat()
        }

        orders.append(new_order)
        write_json(ORDERS_FILE, orders)

        self.send_json({
            'success': True,
            'message': 'Order placed',
            'order': new_order
        })

    def handle_update_order(self, order_id, data):
        status = data.get('status')

        if not status:
            return self.send_error_json('Status required', 400)

        orders = read_json(ORDERS_FILE)
        order = next((o for o in orders if o['id'] == order_id), None)

        if not order:
            return self.send_error_json('Order not found', 404)

        order['status'] = status
        order['updatedAt'] = datetime.now().isoformat()

        write_json(ORDERS_FILE, orders)

        self.send_json({
            'success': True,
            'message': 'Order updated',
            'order': order
        })

if __name__ == '__main__':
    print(f"🚀 ZenMeat backend running on http://10.131.173.110:{PORT}")
    print(f"📁 Data stored in {DATA_DIR}")
    
    with socketserver.TCPServer(("", PORT), ZenMeatHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n✋ Backend stopped")
            httpd.shutdown()
