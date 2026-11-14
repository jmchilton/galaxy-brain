#!/usr/bin/env bash
# Which transport remote_transfer staging uses in each image, and peak RSS of
# post_file for a 400 MB output. Usage: transport_check.sh IMAGE...
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
PORT=18778
python3 "$HERE/sink.py" 172.17.0.1 $PORT &
SINK=$!
trap 'kill $SINK' EXIT
sleep 1
for image in "$@"; do
  echo "## $image ($(docker image inspect -f '{{.Id}}' "$image"))"
  docker run --rm --read-only --tmpfs /work:size=450m "$image" python -c "
import resource
from pulsar.client.transport import get_file, post_file
try:
    import pycurl
    print('pycurl', pycurl.version)
except ImportError:
    print('pycurl not installed')
print('get_file from', get_file.__module__, '- post_file from', post_file.__module__)
with open('/work/output.dat', 'wb') as fh:
    chunk = b'x' * (1 << 20)
    for _ in range(400):
        fh.write(chunk)
before = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024
post_file('http://172.17.0.1:$PORT/api/jobs/42/files?path=output.dat', '/work/output.dat')
after = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024
print(f'peak RSS before upload {before} MB, after posting 400 MB {after} MB')
" 2>&1 | grep -v Warning
  echo
done
