#!/usr/bin/env python3
# Локальный сервер www/ с запретом кеширования — чтобы Telegram/Safari не держали
# старую (сломанную) версию. Порт 8765 (в него смотрит cloudflared-туннель).
import http.server, socketserver, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "www"))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 8765), Handler) as httpd:
    print("no-cache server on 8765")
    httpd.serve_forever()
