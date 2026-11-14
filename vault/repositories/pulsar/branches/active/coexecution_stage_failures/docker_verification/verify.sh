#!/usr/bin/env bash
# Throwaway RabbitMQ + fake Galaxy, then verify.py against two staging images.
# Usage: verify.sh NEW_IMAGE OLD_IMAGE PULSAR_VENV_PYTHON
set -euo pipefail
NEW_IMAGE=$1 OLD_IMAGE=$2 PY=$3
HERE=$(cd "$(dirname "$0")" && pwd)
RABBIT=wes-tes-rabbitmq-pulsarfix
RABBITMQ_IMAGE='rabbitmq:4.3.7-management@sha256:8e913a7748f808be4ce117c3df11817935775bcd83934d4de92441a7e93e9899'
export PULSARFIX_AMQP_USER=pulsarfix PULSARFIX_AMQP_PASS=$(openssl rand -hex 16)
export PULSARFIX_AMQP_PORT=18772 PULSARFIX_GALAXY_PORT=18774 PULSARFIX_CLOSED_PORT=18775 PULSARFIX_REJECT_PORT=18777
export PULSARFIX_UPLOAD_DIR=$(mktemp -d)
cleanup() {
  docker rm -f "$RABBIT" >/dev/null 2>&1 || true
  kill $(jobs -p) 2>/dev/null || true
  rm -rf "$PULSARFIX_UPLOAD_DIR"
}
trap cleanup EXIT
RABBITMQ_DEFAULT_USER=$PULSARFIX_AMQP_USER RABBITMQ_DEFAULT_PASS=$PULSARFIX_AMQP_PASS \
  docker run -d --name "$RABBIT" --hostname "$RABBIT" --memory 512m \
  -e RABBITMQ_DEFAULT_USER -e RABBITMQ_DEFAULT_PASS \
  -p 127.0.0.1:$PULSARFIX_AMQP_PORT:5672 -p 172.17.0.1:$PULSARFIX_AMQP_PORT:5672 "$RABBITMQ_IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker logs "$RABBIT" 2>&1 | grep -q 'Server startup complete' && break
  sleep 2
done
python3 "$HERE/fake_galaxy.py" 172.17.0.1 $PULSARFIX_GALAXY_PORT "$PULSARFIX_UPLOAD_DIR" 2>/dev/null &
python3 "$HERE/fake_galaxy.py" 172.17.0.1 $PULSARFIX_REJECT_PORT "$PULSARFIX_UPLOAD_DIR" --reject-post 2>/dev/null &
sleep 1
echo "# Staging image verification, $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo
echo "New image: $NEW_IMAGE ($(docker image inspect -f '{{.Id}}' "$NEW_IMAGE"))"
echo "Old image: $OLD_IMAGE ($(docker image inspect -f '{{.Id}}' "$OLD_IMAGE"))"
echo "Broker: $RABBITMQ_IMAGE, throwaway credentials, container removed afterwards"
"$PY" "$HERE/verify.py" "$NEW_IMAGE" "$OLD_IMAGE"
