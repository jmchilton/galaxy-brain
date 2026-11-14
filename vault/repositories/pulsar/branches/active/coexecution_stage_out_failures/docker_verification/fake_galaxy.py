"""Stand-in for Galaxy's job files API: GET returns a fixed input, POST stores the upload.

Usage: fake_galaxy.py HOST PORT UPLOAD_DIR [--reject-post]
"""
import email.parser
import email.policy
import http.server
import os
import sys
import urllib.parse

HOST, PORT, UPLOAD_DIR = sys.argv[1], int(sys.argv[2]), sys.argv[3]
REJECT_POST = "--reject-post" in sys.argv
INPUT_CONTENTS = b"cow file contents\n"


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Length", str(len(INPUT_CONTENTS)))
        self.end_headers()
        self.wfile.write(INPUT_CONTENTS)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        if REJECT_POST:
            self.send_response(500)
            self.end_headers()
            return
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(query.get("path", ["upload"])[0])
        content_type = self.headers.get("Content-Type", "")
        if content_type.startswith("multipart/form-data"):
            # Pulsar posts outputs as a multipart form with one "file" part.
            message = email.parser.BytesParser(policy=email.policy.HTTP).parsebytes(
                b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body
            )
            body = next(message.iter_parts()).get_payload(decode=True)
        with open(os.path.join(UPLOAD_DIR, name), "wb") as fh:
            fh.write(body)
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # Strip the query string (Galaxy's would carry a job_key).
        sys.stderr.write("fake_galaxy: %s %s\n" % (self.command, self.path.split("?")[0]))


http.server.ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
