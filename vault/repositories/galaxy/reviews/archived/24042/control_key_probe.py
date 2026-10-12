import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, unquote, urlsplit
from xml.etree import ElementTree
import boto3
from galaxy.objectstore.s3_boto3 import S3ObjectStore

PREFIX = '000/dataset_1_files/'
KEYS = [PREFIX + 'ordinary', PREFIX + 'control\x01name']
remaining = set(KEYS)
requests = []
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def respond(self, status, data=b''):
        self.send_response(status)
        self.send_header('Content-Type', 'application/xml')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        requests.append(('GET', self.path))
        listing = '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><EncodingType>url</EncodingType><IsTruncated>false</IsTruncated>'
        listing += ''.join('<Contents><Key>' + quote(k, safe='') + '</Key></Contents>' for k in KEYS)
        self.respond(200, (listing + '</ListBucketResult>').encode())
    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        requests.append(('POST', repr(body)))
        try:
            root = ElementTree.fromstring(body)
        except ElementTree.ParseError:
            self.respond(400, b'<Error><Code>MalformedXML</Code><Message>Invalid XML control character</Message></Error>')
            return
        for node in root.iter():
            if node.tag.endswith('Key'):
                remaining.discard(node.text)
        self.respond(200, b'<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"/>')
    def do_DELETE(self):
        key = unquote(urlsplit(self.path).path).split('/', 2)[-1]
        requests.append(('DELETE', self.path))
        remaining.discard(key)
        self.respond(204)
server = ThreadingHTTPServer(('127.0.0.1',0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
store = object.__new__(S3ObjectStore)
store.bucket = 'test-bucket'
store._client = boto3.client('s3', region_name='us-east-1', endpoint_url=f'http://127.0.0.1:{server.server_port}', aws_access_key_id='test', aws_secret_access_key='test')
try:
    listed = list(store._keys(PREFIX))
    assert listed == KEYS, (listed, KEYS)
    result = store._delete_remote_all(PREFIX)
    print(json.dumps({'new_method_success':result,'keys_left':sorted(remaining),'requests':requests}, indent=2))
    assert result is False and remaining == set(KEYS)
    requests.clear()
    # Pre-change implementation uses the same listing and individual delete calls.
    for key in store._keys(PREFIX):
        store._client.delete_object(Bucket=store.bucket, Key=key)
    print(json.dumps({'old_method_keys_left':sorted(remaining),'requests':requests}, indent=2))
    assert not remaining
finally:
    store._client.close()
    server.shutdown()
    server.server_close()
