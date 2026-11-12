Run via gpt-6-sol at medium effort.

# Codex review (hardening round 2)

Scope `git diff origin/dev...HEAD` at `72cfeb134af`. Two findings; both acted on in `a2fbe32e79d`. (Round 1's triage held a security-categorized finding, so it went to John's private report and has no debrief here.)

Not acted on: nothing.

## Triage

1. **Nested relative paths can resolve to a `static/images/` copy first** (`lib/galaxy/tools/help_images.py` `find_tool_asset`): **CONFIRMED as a docs mismatch, behaviour kept.**
   - Any path outside `static/images/` is tried under `static/images/` first, not only bare names. That's exactly the old Tool Shed rule (`shed_tool_static`), which shed RST now depends on.
   - The XSD and endpoint `path` description now say "a path outside `static/images/`" instead of "a bare file name".
2. **`If-None-Match: *` not honoured** (`lib/galaxy/webapps/base/api.py` `cached_file_response`): **CONFIRMED, fixed.** A `*` now gets a 304 for an existing file (RFC 9110). The new assertion in `test_tool_help_image_caching` was red first (it got a 200).

Coverage notes from Codex: the two new PNG fixtures weren't inspected as binary.

<details>
<summary>Raw findings</summary>

- P2 correctness `lib/galaxy/tools/help_images.py:28`: "Nested relative paths can resolve to the wrong image". The documented `static/images/` preference applies to bare filenames, but the condition prepends it to nested paths too, and checks that candidate before the path named in the help. Failure: a tool contains both `images/plot.png` and `static/images/images/plot.png`; help references `images/plot.png`; the endpoint serves `static/images/images/plot.png`. (certain)
- P2 api-contract `lib/galaxy/webapps/base/api.py:250`: "Conditional GET ignores the wildcard If-None-Match value". `If-None-Match: *` matches any existing representation, but the helper returns 200 with the file for both the image and icon endpoints. (certain)

</details>
