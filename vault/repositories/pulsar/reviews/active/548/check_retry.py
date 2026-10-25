import importlib.util
import io
import tempfile
from unittest.mock import patch

import requests
from tusclient import client

spec = importlib.util.spec_from_file_location('pulsar_tus_review', '/Users/jxc755/projects/worktrees/pulsar/pr/548/pulsar/client/transport/tus.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.PULSAR_TUS_CHUNK_SIZE = 4
module.PULSAR_TUS_RETRY_DELAY = 0

class Response:
    def __init__(self, status=204, headers=None):
        self.status_code = status
        self.headers = headers or {}
        self.content = b''
    def raise_for_status(self):
        assert 200 <= self.status_code < 300

for failure_mode in ['timeout-before-write', 'timeout-after-partial-write', 'http-503', 'retry-exhaustion']:
    received = bytearray()
    patches = []
    posts = []
    heads = []
    def post(url, **kwargs):
        posts.append((url, kwargs))
        return Response(201, {'location': '/upload/123'}) if 'headers' in kwargs else Response()
    def head(url, **kwargs):
        heads.append(url)
        return Response(headers={'upload-offset': str(len(received))})
    def patch_request(url, *, data, headers, **kwargs):
        offset = int(headers['upload-offset'])
        patches.append((offset, data))
        assert offset == len(received)
        if len(patches) == 2 or failure_mode == 'retry-exhaustion':
            if failure_mode == 'timeout-after-partial-write':
                received.extend(data[:2])
            if failure_mode == 'http-503':
                return Response(503)
            raise requests.Timeout('simulated network timeout')
        received.extend(data)
        return Response(headers={'upload-offset': str(len(received))})
    with tempfile.NamedTemporaryFile() as source:
        source.write(b'abcdefghijkl')
        source.flush()
        with patch('requests.post', post), patch('requests.head', head), patch('requests.patch', patch_request):
            try:
                module.tus_upload_file('http://galaxy.test/api/jobs/1/files?job_key=k', source.name)
            except Exception as exc:
                assert failure_mode == 'retry-exhaustion', (failure_mode, exc)
                assert len(patches) == 11, len(patches)
                assert len(posts) == 1
            else:
                assert failure_mode != 'retry-exhaustion'
                assert received == b'abcdefghijkl', (failure_mode, received)
                assert len(posts) == 2
                assert len(heads) == 1
    print(f'{failure_mode}: PASS (PATCH={len(patches)}, HEAD={len(heads)}, POST={len(posts)})')
