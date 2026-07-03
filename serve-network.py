#!/usr/bin/env python3
"""Serve ZenMeat frontend on network interface"""

import http.server
import socketserver
import os

# Change to the project directory
os.chdir('c:\\Users\\PAVAN S\\OneDrive\\Desktop\\ZenMeat')

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

# Listen on all interfaces (0.0.0.0) for network access
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"ZenMeat frontend running on http://10.131.173.110:{PORT}")
    print(f"Access from other devices: http://10.131.173.110:{PORT}")
    print(f"Local access: http://127.0.0.1:{PORT}")
    print("\nPress Ctrl+C to stop the server\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nFrontend server stopped")
        httpd.shutdown()
