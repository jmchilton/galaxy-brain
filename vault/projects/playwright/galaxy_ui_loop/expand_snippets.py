"""Inline GTN `{% snippet faqs/... %}` includes, as the rendered tutorial shows them.

Usage: python expand_snippets.py TRAINING_MATERIAL_ROOT < tutorial.md > expanded.md
"""

import re
import sys
from pathlib import Path

SNIPPET = re.compile(r"^(?P<prefix>.*?)\{% snippet (?P<path>\S+) %\}\s*$")
FRONTMATTER = re.compile(r"\A---\n(?P<meta>.*?)\n---\n", re.DOTALL)
TITLE = re.compile(r"^title:\s*['\"]?(?P<title>.*?)['\"]?\s*$", re.MULTILINE)


def expand(text: str, root: Path) -> str:
    lines = []
    for line in text.splitlines():
        match = SNIPPET.match(line)
        if not match:
            lines.append(line)
            continue
        source = (Path(root) / match["path"]).read_text()
        body = source
        frontmatter = FRONTMATTER.match(source)
        if frontmatter:
            body = source[frontmatter.end() :]
            title = TITLE.search(frontmatter["meta"])
            if title:
                body = f"**{title['title']}**\n{body}"
        prefix = match["prefix"]
        lines += [prefix + part if part else prefix.rstrip() for part in body.strip("\n").splitlines()]
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    sys.stdout.write(expand(sys.stdin.read(), Path(sys.argv[1])))
