#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""Telegram bridge for the telegram desk agent.

  tg.py bridge <terminal>   long-poll the bot and `hc send` John's messages to <terminal>
  tg.py reply <text>        send <text> (or stdin) to John

Config: ~/.config/galaxy-brain/telegram.env with TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USERS (comma-separated
numeric Telegram user ids; replies go to the first). Senders not on the list are logged with their id, never forwarded.
"""

import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

CONFIG = Path.home() / ".config/galaxy-brain/telegram.env"
OFFSET = Path.home() / ".local/state/galaxy-brain/telegram_offset"
MAX_TEXT = 4000
PREFIX = "[telegram from John]"


def log(msg: str) -> None:
    print(f"{time.strftime('%H:%M:%S')} {msg}", file=sys.stderr, flush=True)


def load_config(path: Path = CONFIG) -> dict[str, str]:
    if not path.exists():
        raise SystemExit(f"missing {path}: set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_USERS")
    config = {}
    for line in path.read_text().splitlines():
        key, sep, value = line.partition("=")
        if sep and not key.strip().startswith("#"):
            config[key.strip()] = value.strip().strip("'\"")
    if not config.get("TELEGRAM_BOT_TOKEN"):
        raise SystemExit(f"no TELEGRAM_BOT_TOKEN in {path}")
    return config


def allowed_users(config: dict[str, str]) -> list[int]:
    return [int(u) for u in config.get("TELEGRAM_ALLOWED_USERS", "").replace(" ", "").split(",") if u]


def api(token: str, method: str, http_timeout: float = 30, **params) -> object:
    data = urllib.parse.urlencode(params).encode()
    url = f"https://api.telegram.org/bot{token}/{method}"
    with urllib.request.urlopen(url, data=data, timeout=http_timeout) as response:
        body = json.load(response)
    if not body.get("ok"):
        raise RuntimeError(f"{method}: {body.get('description')}")
    return body["result"]


def to_prompt(update: dict, allowed: list[int]) -> str | None:
    """The desk input for an update, or None to drop it."""
    msg = update.get("message")
    if not msg:
        return None
    sender = msg.get("from", {}).get("id")
    if sender not in allowed:
        log(f"dropped message from unlisted user {sender} ({msg.get('from', {}).get('username')})")
        return None
    text = msg.get("text")
    if text is None:
        return f"{PREFIX} (sent something other than text; the bridge only forwards text)"
    return f"{PREFIX} {text}"


def send(token: str, chat: int, text: str) -> None:
    text = text.strip() or "(empty)"
    if len(text) > MAX_TEXT:
        text = text[: MAX_TEXT - 1] + "…"
    api(token, "sendMessage", chat_id=chat, text=text)


def read_offset() -> int:
    try:
        return int(OFFSET.read_text())
    except (FileNotFoundError, ValueError):
        return 0


def write_offset(offset: int) -> None:
    OFFSET.parent.mkdir(parents=True, exist_ok=True)
    OFFSET.write_text(str(offset))


def forward(terminal: str, prompt: str) -> str | None:
    """`hc send` prompt to terminal; an error string on failure."""
    # Without HC_TERMINAL_ID the desk doesn't treat the bridge as an agent to report back to.
    env = {k: v for k, v in os.environ.items() if k != "HC_TERMINAL_ID"}
    try:
        result = subprocess.run(["hc", "send", terminal, prompt], env=env, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        return "timed out"
    return None if result.returncode == 0 else (result.stderr or result.stdout).strip() or f"exit {result.returncode}"


def bridge(terminal: str) -> None:
    config = load_config()
    token, allowed = config["TELEGRAM_BOT_TOKEN"], allowed_users(config)
    if not allowed:
        log("TELEGRAM_ALLOWED_USERS is empty: every message is dropped; DM the bot and read its id here")
    offset = read_offset()
    log(f"forwarding to {terminal}")
    while True:
        try:
            updates = api(token, "getUpdates", http_timeout=60, offset=offset, timeout=50, allowed_updates='["message"]')
        except Exception as e:  # network blips shouldn't kill the bridge
            log(f"getUpdates failed: {e}")
            time.sleep(5)
            continue
        for update in updates:
            offset = update["update_id"] + 1
            write_offset(offset)
            prompt = to_prompt(update, allowed)
            if prompt is None:
                continue
            error = forward(terminal, prompt)
            if error:
                log(f"hc send failed: {error}")
                try:
                    send(token, allowed[0], f"The desk didn't get that: {error}")
                except Exception as e:
                    log(f"sendMessage failed: {e}")


def reply(text: str) -> None:
    config = load_config()
    allowed = allowed_users(config)
    if not allowed:
        raise SystemExit("TELEGRAM_ALLOWED_USERS is empty: no one to reply to")
    send(config["TELEGRAM_BOT_TOKEN"], allowed[0], text)


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "bridge":
        bridge(argv[1])
    elif argv and argv[0] == "reply":
        reply(" ".join(argv[1:]) if len(argv) > 1 else sys.stdin.read())
    else:
        print(__doc__, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
