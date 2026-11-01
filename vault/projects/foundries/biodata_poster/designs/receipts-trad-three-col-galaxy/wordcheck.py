# /// script
# dependencies = ["pymupdf"]
# ///
"""Diff the body-word tokens of two count renders (source vs restyle) the way audit.py counts them."""
import re
import sys
from collections import Counter

import pymupdf


def words(path):
    return Counter(w[4] for w in pymupdf.open(path)[0].get_text("words") if re.search(r"[0-9A-Za-z]", w[4]))


src, new = words(sys.argv[1]), words(sys.argv[2])
only_src, only_new = src - new, new - src
frags = sum(v for k, v in only_src.items() if len(k) == 1)
print(f"tokens: source {sum(src.values())}, new {sum(new.values())}")
print(f"source-only single-letter fragments: {frags}")
print("source-only words:", dict(sorted((k, v) for k, v in only_src.items() if len(k) > 1)))
print("new-only words:", dict(sorted(only_new.items())))
