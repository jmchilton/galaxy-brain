"""HTTP server that reads and discards POST bodies. Usage: sink.py HOST PORT"""
import http.server
import sys


class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        remaining = int(self.headers.get("Content-Length", 0))
        while remaining > 0:
            remaining -= len(self.rfile.read(min(remaining, 1 << 20)))
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass


http.server.ThreadingHTTPServer((sys.argv[1], int(sys.argv[2])), Handler).serve_forever()
