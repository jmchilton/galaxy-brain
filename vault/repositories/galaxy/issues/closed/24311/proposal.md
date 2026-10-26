**Title:** New upload panel no longer converts line endings by default (26.2 regression)

Since the new upload panel became the default in 26.2, uploads are no longer converted to POSIX line endings unless a user turns on a toggle that only advanced mode shows.

| | Upload button opens | `to_posix_lines` by default | Paste `1⇥2⇥3` (no final newline) |
|---|---|---|---|
| 26.0, 26.1 | old upload dialog | ✅ `true` | stored as `1⇥2⇥3\n` |
| 26.2, dev | new upload panel | ❌ `false`, toggle hidden outside advanced mode | stored as `1⇥2⇥3` (5 bytes) |

Turning conversion off changes two things that line-oriented tools have quietly relied on for years:

- **CRLF and CR stay as they are.** Windows-edited files reach tools with `\r` still on every line.
- **No trailing newline is added.** Pasted content almost never ends in one, so the last line has no terminator.

For example, Cut (`Cut1`) with `c1,c3` on the pasted `1⇥2⇥3` returns `1⇥.` instead of `1⇥3`, because `tools/filters/cutWrapper.pl` calls `chop` on each line, which removes the `3` instead of a newline. The wrapper can be fixed (`chomp`), but other tool scripts likely make the same assumption. Tool tests can't catch this: test-data uploads go through `lib/galaxy/tool_util/client/staging.py`, which still defaults `to_posix_lines=True`.

<details><summary>Steps to reproduce (26.2)</summary>

1. Upload → Paste File Content. Enter `1<TAB>2<TAB>3` with no final newline and set the type to `tabular`. Leave advanced mode off and the row options at their defaults.
2. The dataset is 5 bytes. No newline was added.
3. Run Cut (`Cut1`) with `c1,c3`. The output is `1<TAB>.`.

On 26.1 the old dialog sends `to_posix_lines: true`, and `convert_newlines` in `lib/galaxy/datatypes/sniff.py` appends the missing `\n`.

</details>

<details><summary>Where the default comes from</summary>

- Old dialog, the default through 26.1: `client/src/components/Upload/model.ts` sets `toPosixLines: true`.
- New panel: `client/src/composables/upload/uploadOptionModel.ts` defines `toPosixLines` with `defaultValue: false`, and `client/src/components/Panels/Upload/shared/uploadOptionVisibility.ts` shows the toggle only in advanced mode. The panel has defaulted to `false` since it was added as a beta activity (#21338; the value moved to `uploadOptionModel.ts` in eaaf8604fad). That reached few users until #22787 made the panel the default for every upload entry point.
- The client is now inconsistent: the ZIP explorer import (`client/src/composables/zipExplorer.ts`) still reads the old `model.ts` defaults and sends `to_posix_lines: true`.
- The fetch API defaults to `false` as well (`lib/galaxy/tools/data_fetch.py`, `request.get("to_posix_lines", False)`; `lib/galaxy/schema/fetch_data.py`), so the client was the only thing turning conversion on.
- The #21338 description lists "POSIX line ending options hidden unless needed". That covers hiding the toggle. Neither PR mentions changing the default.

</details>

## Context

A follow-up to 🔀 #22787 (new upload experience made the default). Related to 🔀 #21338, which introduced the panel and its option defaults. Related to 🎯 #18619, which asks to document that the POSIX option also adds a final newline.

## Proposed Approach

Set `toPosixLines` back to `defaultValue: true` in `uploadOptionModel.ts` so the new panel matches the old dialog. Add a test that pastes `a` through the panel and checks that the dataset contents are `a\n`.

## Alternative Approaches

We could keep `false` and make tools robust instead, or turn conversion on by default on the server side. Fixing tools one by one can't reach third-party tool wrappers. A server-side change would also alter API and library uploads that have always defaulted to `false`. Restoring the client default puts back the exact behaviour from 26.1 and earlier, and changes nothing else.

<details><summary>Alternatives In Detail</summary>

### Alternative: Keep `false`, fix tools

<details><summary>Description</summary>

#### Details

Fix `cutWrapper.pl` (`chop` → `chomp`) and audit other stock wrappers for code that assumes a trailing newline or LF endings.

#### Why the proposed approach is preferred

The cutWrapper fix is worth doing anyway, but Galaxy can't audit Tool Shed wrappers, and for most users silently keeping CRLF is a behaviour change, not a feature.

</details>

### Alternative: Server-side default

<details><summary>Description</summary>

#### Details

Change `data_fetch.py` and `schema/fetch_data.py` to default `to_posix_lines` to `True`.

#### Why the proposed approach is preferred

It would change the behaviour of API clients, BioBlend scripts and library imports that rely on the current `False` default. The regression is in the client, so the fix belongs there.

</details>

</details>
