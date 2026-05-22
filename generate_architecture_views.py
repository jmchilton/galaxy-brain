#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pyyaml",
#     "pydantic",
# ]
# ///
"""Generate vault views of galaxy-architecture topics.

Reuses the upstream Sphinx renderer (generate_topic_markdown) so vault
output matches the published docs at jmchilton.github.io/galaxy-architecture.

Usage:
    uv run generate_architecture_views.py            # regenerate all topics
    uv run generate_architecture_views.py --topic X  # single topic
    uv run generate_architecture_views.py --check    # exit 1 on drift
"""

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.resolve()
SUBMODULE = REPO_ROOT / "galaxy-architecture"
TOPICS_SRC = SUBMODULE / "topics"
VIEWS_DIR = REPO_ROOT / "vault" / "projects" / "architecture" / "topics"

UPSTREAM_PAGES_BASE = "https://jmchilton.github.io/galaxy-architecture"

# Upstream renderer lives in two sibling dirs that import each other.
sys.path.insert(0, str(SUBMODULE / "scripts"))
sys.path.insert(0, str(SUBMODULE / "outputs" / "sphinx-docs"))

from build import generate_topic_markdown  # noqa: E402


def list_topics() -> list[str]:
    return sorted(
        p.name for p in TOPICS_SRC.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    )


def rewrite_for_vault(markdown: str, topic_id: str) -> str:
    # Upstream emits ../../images/foo.png (Sphinx context, doc/source/architecture/*).
    # Rewrite to upstream GitHub Pages URLs (Sphinx publishes them under /_images/).
    # Avoids bundling binary assets and the plantuml/docker build dependency locally.
    markdown = markdown.replace("../../images/", f"{UPSTREAM_PAGES_BASE}/_images/")

    # Drop the upstream "📊 View as slides" line — raw HTML inside a blockquote
    # doesn't render cleanly in Obsidian/Astro and the link target isn't worth it.
    slides_line = f'> 📊 <a href="{topic_id}/slides.html">View as slides</a>\n'
    markdown = markdown.replace(slides_line + "\n", "")
    markdown = markdown.replace(slides_line, "")
    return markdown


def render_topic(topic_id: str) -> str:
    topic_dir = TOPICS_SRC / topic_id
    md = generate_topic_markdown(topic_id, topic_dir)
    return rewrite_for_vault(md, topic_id).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--topic", help="Generate only this topic")
    parser.add_argument("--check", action="store_true", help="Exit 1 on drift (does not write)")
    args = parser.parse_args()

    if not TOPICS_SRC.exists():
        print(f"ERROR: submodule missing — run `git submodule update --init` ({TOPICS_SRC})", file=sys.stderr)
        return 2

    # Upstream's load_metadata/load_content default to Path("topics") (cwd-relative).
    os.chdir(SUBMODULE)

    topics = [args.topic] if args.topic else list_topics()
    VIEWS_DIR.mkdir(parents=True, exist_ok=True)

    drifted: list[str] = []
    for topic_id in topics:
        out = VIEWS_DIR / f"{topic_id}.md"
        new_content = render_topic(topic_id)
        if args.check:
            current = out.read_text() if out.exists() else ""
            if current != new_content:
                drifted.append(topic_id)
            continue
        out.write_text(new_content)
        print(f"wrote vault/projects/architecture/topics/{topic_id}.md")

    if args.check and drifted:
        print(f"drift in {len(drifted)} topic(s): {', '.join(drifted)}", file=sys.stderr)
        print("run `make architecture-views` to regenerate", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
