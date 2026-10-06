"""Summarise one Phase 0 run: tokens (Codex session log), wall time, shell commands by kind."""

import collections
import datetime
import glob
import json
import os
import re
import sys

run = sys.argv[1]


def read_jsonl(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    pass


# `codex exec --json` usage has reported zeros; the session rollout's token_count events do not.
tokens = None
for path in glob.glob(f"{run}/codex-home/sessions/**/rollout-*.jsonl", recursive=True):
    for event in read_jsonl(path):
        payload = event.get("payload") or {}
        if payload.get("type") == "token_count" and payload.get("info"):
            tokens = payload["info"]["total_token_usage"]

commands = collections.Counter()
failed = 0
for event in read_jsonl(f"{run}/events.jsonl"):
    item = event.get("item") or {}
    if event.get("type") != "item.completed" or item.get("type") != "command_execution":
        continue
    command = item.get("command", "")
    match = re.search(r"playwright-cli(?:\s+-s=\S+)?\s+([\w-]+)", command)
    gxui = re.search(r"gxui\s+([\w-]+)", command)
    if match:
        kind = f"playwright-cli {match.group(1)}"
    elif gxui:
        kind = f"gxui {gxui.group(1)}"
    elif re.search(r"\b(curl|wget|httpie)\b|/api/", command):
        kind = "http (rule violation)"
    else:
        kind = "other"
    commands[kind] += 1
    if item.get("exit_code") not in (0, None):
        failed += 1


# Arm A: the gxui transcript records verb / component / call / external (gap) / note layers.
transcript_layers = collections.Counter()
gaps = []
for entry in read_jsonl(f"{run}/gxui/transcript.jsonl") if os.path.exists(f"{run}/gxui/transcript.jsonl") else []:
    transcript_layers[entry.get("layer")] += 1
    if entry.get("layer") == "external":
        gaps.append(entry.get("text"))


def stamp(name):
    with open(f"{run}/{name}") as f:
        return datetime.datetime.fromisoformat(f.read().strip().replace("Z", "+00:00"))


try:
    wall_s = (stamp("finished_at") - stamp("started_at")).total_seconds()
except FileNotFoundError:
    wall_s = None

print(
    json.dumps(
        {
            "tokens": tokens,
            "wall_seconds": wall_s,
            "commands_total": sum(commands.values()),
            "commands_failed": failed,
            "commands": dict(commands.most_common()),
            "gxui_layers": dict(transcript_layers),
            "gxui_gaps": gaps,
        },
        indent=2,
    )
)
