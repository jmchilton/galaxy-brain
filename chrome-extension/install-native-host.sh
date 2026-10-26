#!/bin/sh
# Registers herdr-plugin's native messaging host with Chrome for this extension (macOS).
set -eu
repo=$(cd "$(dirname "$0")/.." && pwd)
dir="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
# Fixed by the "key" in manifest.json.
id=mkckliibikdomehoflcgoefdhlolgdah
mkdir -p "$dir"
cat > "$dir/org.galaxybrain.launcher.json" <<JSON
{
  "name": "org.galaxybrain.launcher",
  "description": "galaxy-brain agent launcher",
  "path": "$repo/herdr-plugin/bin/native-host.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$id/"]
}
JSON
echo "Wrote $dir/org.galaxybrain.launcher.json"
