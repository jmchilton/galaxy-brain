# /// script
# requires-python = ">=3.11"
# ///
"""Claude-only scraper: print John's own messages from factory agents' Claude Code transcripts.

Reads ~/.claude/projects/<agents-dir-slug>-<agent>/*.jsonl. Sessions from other tools (Codex, etc.)
are not covered; those reach the factory through sessions_for_retro/.
"""

import argparse
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent.parent
PROJECT_SLUG = re.sub(r"[^A-Za-z0-9]", "-", str(AGENTS_DIR)) + "-"
NOISE_PREFIXES = (
    "<",
    "Another Claude session sent a message",
    "This session is being continued",
)
REJECTION = "The user doesn't want to proceed with this tool use."
PASTED = re.compile(r"<pasted_content[^>]*>.*?</pasted_content>", re.DOTALL)


def message_texts(entry):
    content = entry.get("message", {}).get("content")
    if isinstance(content, str):
        yield content
        return
    for part in content or []:
        if part.get("type") == "text":
            yield part.get("text", "")
        elif part.get("type") == "tool_result" and part.get("is_error"):
            body = part.get("content")
            if isinstance(body, list):
                body = " ".join(p.get("text", "") for p in body if isinstance(p, dict))
            if isinstance(body, str) and body.startswith(REJECTION):
                yield "[rejected a tool use]"


def clean(text, max_chars):
    text = PASTED.sub("[pasted content]", text).strip()
    if not text or text.startswith(NOISE_PREFIXES):
        return None
    text = " ".join(text.split())
    return text if len(text) <= max_chars else text[:max_chars] + " …"


def session_messages(path, since, max_chars):
    for line in path.open():
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("type") != "user" or entry.get("isSidechain"):
            continue
        if entry.get("isMeta") or entry.get("isCompactSummary"):
            continue
        timestamp = entry.get("timestamp", "")
        if timestamp[:10] < since:
            continue
        for text in message_texts(entry):
            cleaned = clean(text, max_chars)
            if cleaned:
                yield timestamp, cleaned


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", default=str(date.today() - timedelta(days=14)), help="YYYY-MM-DD")
    parser.add_argument("--max-chars", type=int, default=600)
    parser.add_argument("--projects-dir", type=Path, default=Path.home() / ".claude" / "projects")
    args = parser.parse_args()

    for project in sorted(args.projects_dir.glob(PROJECT_SLUG + "*")):
        agent = project.name[len(PROJECT_SLUG) :]
        sessions = []
        for path in project.glob("*.jsonl"):
            if datetime.fromtimestamp(path.stat().st_mtime).date().isoformat() < args.since:
                continue
            messages = list(session_messages(path, args.since, args.max_chars))
            if messages:
                sessions.append((messages[0][0], path.stem, messages))
        if not sessions:
            continue
        print(f"# {agent}\n")
        for started, session_id, messages in sorted(sessions):
            print(f"## {started[:16]} {session_id[:8]}\n")
            for timestamp, text in messages:
                print(f"- {timestamp[11:16]} {text}")
            print()


if __name__ == "__main__":
    main()
