Three behavior-preserving refactor commits on `origin/dev` ahead of the feature: input-reference walker move, `writes_galaxy_json()` helper, `tool_requests_provided_metadata()` extraction; the later "share helper" fix commits folded into the 26.1/26.2 advice commit.

## Refactor commits

- `252fdeb0715` Move linter input reference walker to linters/_util (unchanged from prior baseline).
- `c0406db498f` Share galaxy.json detection helper from linters/_util - output linter's inline check becomes `writes_galaxy_json()` (also tolerates empty `<command>` text). Was linter half of `1b951469a3d`.
- `acea709859b` Extract tool_requests_provided_metadata from AbstractTool - `output_uses_tool_provided_metadata` + `tool_requests_provided_metadata` in `parser/output_objects.py`, `AbstractTool._uses_tool_provided_metadata` uses them. Combines extraction formerly in `73af3361b18` with `321ae6380f9`'s non-upgrade half.

## Feature commits

- `8210455c21d`, `bf0d8aa626a`, `d7cec17a4e4`, `901c34f0298`, `145022e5d7c`, `09c03b73cde` - rebased, content unchanged.
- `6e63305a91e` Add 26.1 and 26.2 tool profile upgrade advice - now only upgrade/case.py/codes/tests; uses shared helpers from the start (upgrade halves of `1b951469a3d` + `321ae6380f9` folded in, incl. its configfile galaxy.json test). Extraction paragraph dropped from message.
- `b5a085365fd`, `1020e86a7d9`, `07b1b68e6a9` - rebased, content unchanged.

Final tree identical to old tip `321ae6380f9` (backup branch deleted after verify). Tests pass at `c0406db498f`, `acea709859b` and tip (upgrade + linters + parameter test cases 206 at tip; `test/unit/app/tools -k provided_metadata` 25). Not pushed - remote needs force push.
