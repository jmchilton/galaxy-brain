# PR 23275 — Name DRS-fetched datasets from DRS metadata instead of the URI basename

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23275 |
| **Author** | dannon (Dannon Baker) |
| **Base branch** | `release_26.1` (not `dev`) |
| **Head** | `568f058ad4` |
| **Size** | 8 files, +303 / -7 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23275` |
| **Verdict** | **Approve with comments.** No P1. Design is sound and I verified every claim the author made. Two P2s (typed payload; stale comment + deferred divergence) and a handful of nits. |

---

## What it does

`fetch_drs_to_file()` already GETs the DRS object JSON to resolve access methods; that JSON
carries a `name` field which was being thrown away, so `drs://` fetches landed in the history
named after the URI's last path segment — for most DRS servers an opaque UUID. The PR reports
that name back up to `data_fetch._has_src_to_path()` through a new optional `metadata_out: dict`
out-parameter carried on `FilesSourceRuntimeContext`, and adds `sanitize_drs_name()` to make an
untrusted remote string safe to use as a dataset name.

---

## Claims I verified (all hold)

I checked each of these against the code rather than the PR description.

**1. Only two signatures grew a parameter; no plugin was touched.**
`SingleFileSource.realize_to` (abstract, `lib/galaxy/files/sources/__init__.py:117`),
`BaseFilesSource.realize_to` (`:606`), and `BaseFilesSource._get_runtime_context` (`:471`).
Grepping `def realize_to|def _realize_to` across `lib/`, `test/`, `packages/` returns exactly
two `realize_to` definitions (the abstract one and `BaseFilesSource`'s) and thirteen `_realize_to`
implementations, none of which changed. The value rides on the context object, so the plugin
contract is untouched. ✓

**2. No cross-contamination of `metadata_out` between fetches.** This was my main P1 hunt.
`_get_runtime_context` constructs a brand-new `FilesSourceRuntimeContext` on every call
(`lib/galaxy/files/sources/__init__.py:489`) — it is not cached on the source instance.
`data_fetch._has_src_to_path` allocates `source_metadata: dict[str, Any] = {}` per item inside
the `src == "url"` branch (`lib/galaxy/tools/data_fetch.py:568`). No mutable default argument
anywhere in the chain — every new parameter defaults to `None`, and the only `dict` literal is
the per-item one. Clean. ✓

**3. Explicit request `name` wins — in code, not just in tests.**
`data_fetch.py:543` `name = item.get("name")`; `:588-589`
`if name is None: name = source_metadata.get("name") or url.split("/")[-1]`. ✓

**4. Non-DRS paths are behaviourally identical.** `metadata_out={}` is handed to
`stream_url_to_file` for *every* `src == "url"` item, not just DRS. But `context.metadata_out`
is read in exactly one place — `DRSFilesSource._realize_to` (`lib/galaxy/files/sources/drs.py:69`)
— so for any other source the dict stays empty, `.get("name")` returns `None`, and the old
`url.split("/")[-1]` fallback fires. ✓

**5. The `handle_upload` datatype side effect is bounded — but for a reason worth writing down.**
`os.path.splitext(name)[1]` appears *twice* in `lib/galaxy/datatypes/upload_util.py`: at `:72`
as `uploaded_file_ext=` and at `:100` in the unsniffable-binary branch. The author only mentions
the second. The first is harmless because **`uploaded_file_ext` is a dead parameter**:
`sniff.handle_uploaded_dataset_file_internal` declares it at `lib/galaxy/datatypes/sniff.py:913`
and never references it in the body (`grep -n uploaded_file_ext lib/galaxy/datatypes/sniff.py`
returns exactly one hit — the declaration). So the author's bound is correct, but it's correct
*by accident of dead code*. Worth a sentence in the PR description so that whoever eventually
wires `uploaded_file_ext` up doesn't silently widen a remote server's influence over datatype
selection.

On the "wrong-but-registered extension" question: `registry.is_extension_unsniffable_binary`
(`lib/galaxy/datatypes/registry.py:624`) requires `isinstance(datatype, binary.Binary) and not
hasattr(datatype, "sniff")`, so `bam` — which has a sniffer — is *not* in the reachable set. And
the parity argument holds: `https://host/thing.<ext>` already sets `name = url.split("/")[-1]`
and feeds the identical branch, so a remote host has had exactly this much influence over
unsniffable-binary typing for years. DRS is being brought up to parity, not given new power.

**6. Red-to-green is real.** `a63e101d71` ("Add failing tests…") touches one file,
`test/unit/app/tools/test_data_fetch.py`, +113/-1. I ran the suite at that commit:
**7 failed, 22 passed**. At `568f058ad4`: **29 passed**. `test/unit/files/test_drs.py`: **35 passed**.
`test/unit/files/test_drs.py` landed with the implementation rather than in the red commit,
which is unavoidable — you can't unit-test a function that doesn't exist yet. No test was
weakened; the new assertion added to the pre-existing `test_simple_uri_get`
(`assert hda_result["name"] == "1.bed"`) is a *tightening* that passes on base.

Ran with a borrowed venv (`~/projects/worktrees/galaxy/pr/22781/.venv`, plus `responses` and
`pydantic_extra_types` which were missing from it), `PYTHONPATH=lib:test`. No API/integration/
Selenium tests touched.

**7. `sanitize_drs_name()` survives adversarial input.** I extracted the function verbatim and
fuzzed it against ~50 hostile inputs beyond the ones in the test file. Results:

| input | output | note |
|---|---|---|
| `"a;rm -rf /"` | `None` | trailing `/` ⇒ empty last component ⇒ rejected |
| `"~/evil"` | `"evil"` | |
| `"x/.."`, `"a/../.."`, `" .. "`, `"\t..\t"`, `"..​"` | `None` | dot-segments can't survive by hiding behind whitespace or zero-width |
| `"foo\n../bar"` | `"bar"` | |
| `"C:file.txt"` | `"C:file.txt"` | Windows drive-relative; irrelevant on POSIX |
| `"my file.txt"` | `"myfile.txt"` | NBSP is `Zs` ⇒ `isprintable()` false ⇒ dropped |
| `"..."`, `". ."`, `".hidden"`, `"--version"`, `"~"`, `"$(whoami)"`, `` "`id`" ``, `"*"` | survive verbatim | see P3-5 |
| `"a"*252..256 + "\U0001f600"` | valid UTF-8, ≤255 bytes at every boundary | multi-byte split handled |

Zero separator leaks, zero `.`/`..` leaks, zero invalid UTF-8, byte cap holds exactly.
The `errors="ignore"` decode is the right call and the 255-**byte** framing is correct:
`Column("name", TrimmedString(255))` at `lib/galaxy/model/__init__.py:13079` is a 255-*character*
limit, and any 255-byte UTF-8 string is ≤255 characters, so the single cap really does satisfy
both constraints as the comment claims.

The one place the name genuinely becomes a filesystem path is `walk_extra_files`
(`data_fetch.py:391-401`): `src_name` → `os.path.join(prefix, src_name)` →
`os.path.join(extra_files_path, rel_path)` → `shutil.move`. The sanitizer's single-path-component
guarantee is exactly what that spot needs, and there's no shell involved.

---

## Reuse check — the top review priority

**Does `sanitize_drs_name()` reimplement something?** I searched `galaxy.util`, `galaxy.util.path`,
`lib/galaxy/tools/parameters/sanitize.py`, `lib/galaxy/objectstore/`, and all of `lib/galaxy/files/`.

The closest prior art is **`galaxy.util.sanitize_for_filename`** (`lib/galaxy/util/__init__.py:805`,
one in-tree caller at `lib/galaxy/tools/parameters/grouping.py:678`). It is **not** a substitute,
and I want to be explicit about why so this doesn't come up again:

- It maps every character outside `[A-Za-z0-9_.]` to `_`, so `ünïcödé.txt` → `________.txt`
  and `sample data.bed` → `sample_data.bed`. Destroying legitimate Unicode in a *display name*
  is worse than the problem being solved.
- Its own docstring says "a maximum length is not considered" — no NAME_MAX guard at all.
- On rejection it returns `sanitize_for_filename(str(unique_id()))`, i.e. a random token, rather
  than signalling "nothing usable". The DRS call site needs `None` so it can fall back to the
  URI basename, which is strictly more informative than a random id.

So: writing a new function was correct. **But please say that in the docstring** — one sentence
naming `sanitize_for_filename` and why it wasn't reused. It's a two-line edit that saves the next
reviewer the twenty minutes I just spent, and it's the kind of thing that keeps an old codebase
from growing a third sanitizer next year.

**Does a metadata-return channel already exist in the file-sources stack?** No. I grepped
`Content-Disposition` across `lib/galaxy/` — every hit is response-side (serving downloads to a
browser); nothing on the *fetch* side parses a server-reported filename. There is no existing
"remote source told us something" path being duplicated.

**Why not put it on `FilesSourceOptions`?** This is the obvious "reuse the existing per-call
channel" question, and the answer is that it genuinely doesn't fit: `FilesSourceOptions`
(`lib/galaxy/files/models.py:284`) is a `StrictModel`, i.e. pydantic with `extra="forbid"`.
Pydantic validation copies on construct, so a mutable out-dict hung on it would not reliably
propagate mutations back to the caller — and `extra_props` gets merged into `template_config`,
so it's semantically an *input* model. `FilesSourceRuntimeContext` is a plain class, constructed
fresh per call, never validated or copied. The author picked the right vehicle. Credit where due.

**Is the out-parameter design defensible?** Yes. The alternative — `realize_to` returning
metadata and `stream_url_to_file` returning a tuple — hits 8 call sites across `data_fetch`,
`sniff`, `tool_data`, `deferred` and `model.store` on a release branch, for a feature exactly one
plugin uses. The out-param is additive, provably inert for every other source (claim 4), and
touches three signatures instead of eight call sites. I'd want the return-shape refactor on `dev`
eventually, but I would not block a `release_26.1` PR over it, and I don't think you should
redesign it here.

---

## P2 findings

### P2-1 — `Optional[dict]` should be a `TypedDict`; the package already does this

**Files:** `lib/galaxy/files/models.py:460,476`; `lib/galaxy/files/sources/__init__.py:117,471,606`;
`lib/galaxy/files/uris.py:47`; `lib/galaxy/files/sources/util.py:364`;
`lib/galaxy/tools/data_fetch.py:568`

`lib/galaxy/files/sources/` already reaches for `TypedDict` for exactly this shape of loose,
JSON-ish payload — `invenio.py:56,60,65,69,74,79,87,92,99,194`, `dataverse.py:48`,
`elabftw.py:576`. So there's an established local convention and this doesn't follow it.

Concretely, today both `metadata_out["name"]` (`sources/util.py:413`) and
`source_metadata.get("name")` (`data_fetch.py:589`) are `Any` to mypy. A typo in the key on
either side type-checks fine and silently degrades to the UUID fallback — the exact failure this
PR exists to fix, reintroduced as a silent one. The whole contract currently lives in three
separate prose docstrings that have to be kept in agreement by hand.

This is also the honest answer to "does this leave a reusable abstraction or just accrete?" A
named type is something the second file source extends; a bare `dict` is something the second
file source guesses at. Cheap, zero runtime cost, still purely additive:

```python
# lib/galaxy/files/models.py
from typing_extensions import TypedDict


class RealizedSourceMetadata(TypedDict, total=False):
    """Metadata a file source can report about a source it just realized.

    Every key is optional -- a source populates only what it actually learned.

    ``name``: a human-meaningful name for the realized object that the caller cannot
    derive from the URI. DRS objects carry one; most sources have nothing to add.
    """

    name: str
```

Then swap `Optional[dict]` → `Optional[RealizedSourceMetadata]` at the six annotation sites above,
and in `data_fetch.py`:

```python
source_metadata: RealizedSourceMetadata = {}
```

The property on the context becomes:

```python
    @property
    def metadata_out(self) -> Optional[RealizedSourceMetadata]:
```

### P2-2 — `_has_src_to_name`'s "should broadly match" comment is now false, and the deferred divergence never heals

**File:** `lib/galaxy/tools/data_fetch.py:518-531`

```python
def _has_src_to_name(item) -> Optional[str]:
    # Logic should broadly match logic of _has_src_to_path but not resolve the item
    # into a path.
```

After this PR it no longer matches for `drs://`, and that comment is precisely the kind of thing
that sends the next person looking for a bug that isn't there. Amend it in this PR.

More substantively: the divergence is permanent, not just deferred. When a deferred dataset is
later materialized, `lib/galaxy/model/deferred.py:265` calls `stream_url_to_file(source_uri,
file_sources=..., user_context=...)` with no `metadata_out`, so the name is never revisited. The
same `drs://` URI therefore yields `sample.bed` when fetched eagerly and `000009a0-5b22-…`
*forever* when deferred.

I agree with keeping it out of scope here — fixing it in `_has_src_to_name` would require a DRS
round-trip in the one code path whose entire purpose is to avoid fetching. But `deferred.py:265`
is where it could be fixed cheaply at materialization time, and that deserves a follow-up issue
against `dev` rather than silence. Suggested comment replacement:

```python
def _has_src_to_name(item) -> Optional[str]:
    # Logic should broadly match logic of _has_src_to_path but not resolve the item
    # into a path. Deliberately does not consult file source metadata the way
    # _has_src_to_path does -- a DRS name would require the very fetch deferral avoids,
    # so deferred DRS datasets keep the URI basename.
```

---

## P3 findings

**P3-1 — Class docstring not updated.** `lib/galaxy/files/models.py:458` still reads
"Context for file source operations, providing user data and resolved configuration." It's now
also an output channel. The `metadata_out` property docstring is genuinely excellent, but the
class-level line is what people skim. Suggest: `"""Context for file source operations: user data,
resolved configuration, and an optional channel for a source to report metadata back."""`

**P3-2 — Four copies of `url.split("/")[-1]`.** `data_fetch.py:526` (`_has_src_to_name`), `:557`
(the `prefer_links` early return), `:589` (this PR), plus
`lib/galaxy/tools/actions/upload.py:157` in `_precreate_fetched_hdas`. This PR adds the third
in-file copy. A free one-liner in `data_fetch.py` covers the three local ones and is exactly the
"leave an abstraction behind" ask:

```python
def _name_from_url(url: str) -> str:
    """Last path segment of a URL -- the fallback dataset name when nothing better is known."""
    return url.split("/")[-1]
```

The `upload.py` copy can't be improved; it runs before any fetch has happened.

**P3-3 — The rename does land, but there's a visible UX artifact.** I traced this because it's
the most likely way a change like this silently no-ops: `_precreate_fetched_hdas`
(`lib/galaxy/tools/actions/upload.py:150-161`) creates the HDA named after the URI basename
*before* the job runs. The fetch tool's output name does override it —
`lib/galaxy/model/store/discover.py:930` passes `name=` into `create_dataset`, which does
`if name is not None: primary_data.name = name` on the pre-created `primary_data`. So the feature
works end to end. But the user sees the UUID in their history for the duration of the fetch and
then it changes under them. Harmless; worth one line in the PR description so it isn't filed as
a bug.

**P3-4 — Truncation drops the extension.** `_truncate_to_bytes` keeps a prefix, so a 300-character
name ending in an extension loses it, which also removes it from the unsniffable-binary extension
guess. Absurd edge case and I would not hold the PR for it — flagging only so the choice is
deliberate rather than accidental.

**P3-5 — Non-printables are deleted rather than replaced.** `"my file.txt"` → `"myfile.txt"`,
`"sample\r\n.bed"` → `"sample.bed"` — words get glued together. Deletion is clearly right for
`Cf`/`Cc` (that's the bidi-override defence and it works). For `Zs` specifically, mapping to a
plain space would read better. Genuinely a nit.

**P3-6 — Survivors, and an asymmetry worth naming.** Leading `-` (`"--version"`), leading `.`
(`".bashrc"`), `"..."`, `"~"`, and shell metacharacters all survive sanitization. None are
exploitable in the paths I traced: the only filesystem use is `walk_extra_files`
(`data_fetch.py:391-401`), where the name is joined under an absolute `extra_files_path` and moved
with `shutil.move` — no shell, and the absolute prefix means a leading `-` can never reach argv.

The asymmetry: the **explicit** request `name` (`data_fetch.py:543`) reaches that same
`os.path.join` completely unsanitized today. So after this PR, DRS-reported names are held to a
*stricter* standard than user-supplied ones. That's defensible — untrusted third-party server vs.
authenticated user — but don't let anyone read this PR and conclude the explicit-name path is
already guarded. Follow-up territory against `dev`, not this PR.

**P3-7 — Imports are clean.** `Any` added to the top-level `typing` import in
`sources/util.py:5`; `responses` at the top of the test file. Nothing buried in a function. ✓

---

## Pre-existing issue, adjacent to the diff (not blocking, not yours)

`BaseFilesSource._get_runtime_context` — the exact function this PR extends — already contains
the bug class this PR carefully avoids:

```python
# lib/galaxy/files/sources/__init__.py:479-482
if opts and opts.extra_props:
    extra_props = opts.extra_props.model_dump(exclude_unset=True)
    self.template_config = self.template_config.model_copy(update=extra_props)
```

That mutates the **shared, long-lived file source instance** from a per-call code path, so
`opts.extra_props` from one fetch persists into every subsequent fetch through the same source
object. `metadata_out` deliberately does *not* do this — it stays on the per-call context, which
is the right instinct and is why I found no contamination in claim 2. Worth an issue against
`dev` on its own merits.

---

## Verdict

**Approve with comments.**

The design is sound, the author's reasoning holds on every point I checked, and the release-branch
conservatism argument for the out-parameter is legitimate rather than a rationalisation. The
sanitizer is careful, correctly framed in bytes, and survived everything I threw at it. Red-to-green
is real and no test was weakened.

Address P2-1 (typed payload — cheap and it's the difference between an abstraction and an accretion)
and P2-2 (stale comment, plus file the deferred follow-up) before merge. Everything else is
discretionary.

---

## Implemented locally

Both P2s applied on branch `23275-review-followups` in
`/Users/jxc755/projects/worktrees/galaxy/pr/23275`, on top of dannon's `568f058ad4`. Two
commits, deliberately separable so either can be dropped:

- **`863f2bc03f`** — *Type the file source metadata channel* (P2-1). `RealizedSourceMetadata`
  added to `lib/galaxy/files/models.py`; the six `Optional[dict]` annotations swapped
  (`models.py` ctor + property, `sources/__init__.py` ×3, `uris.py`, `sources/util.py`), plus
  `data_fetch.py`'s `source_metadata` and the two `dict[str, Any]` annotations in
  `test/unit/files/test_drs.py`. Follows the local `from typing_extensions import TypedDict`
  convention (`invenio.py`, `dataverse.py`, `elabftw.py`). Also carries P3-1 (class docstring)
  and the reuse note on `sanitize_drs_name`.
- **`43e3f40619`** — *Say why `_has_src_to_name` diverges from `_has_src_to_path`* (P2-2).

**The P2-1 claim was verified, not asserted.** mypy 2.1.0 against a probe reproducing the real
`_has_src_to_path` shape:

- write side, `metadata_out["nmae"] = ...` → `TypedDict "RealizedSourceMetadata" has no key
  "nmae"  [typeddict-unknown-key]`.
- read side, `source_metadata.get("nmae")` → **not** flagged directly; `.get()` with a
  non-key returns `object`, and the error only surfaces downstream as `Incompatible return
  value type (got "tuple[object | Any, str, bool]", expected "tuple[str, str, bool]")`. Caught,
  but indirectly — worth knowing the mechanism is the `object` leak reaching the annotated
  return, not a direct unknown-key diagnostic.

Not done: `RealizedSourceMetadata` did **not** get the long explanatory docstring the finding
proposed. The sibling TypedDicts in `invenio.py` carry no docstrings at all, and the
`metadata_out` property docstring dannon already wrote covers the DRS usage — a second copy is
duplication. One line.

**Verification**: `test/unit/files/test_drs.py` + `test/unit/app/tools/test_data_fetch.py` —
64 passed, matching the pre-change baseline exactly (no behaviour change intended; this is
annotations, a comment, and docstrings). black 26.1.0, ruff 0.14.8, flake8 clean via pre-commit;
isort 8.0.1 checked **manually** — it is not a pre-commit hook in Galaxy, it runs from the
Makefile, which is how it was missed on the #23252 follow-ups.

Left for dannon rather than patched here: the deferred-materialization follow-up
(`model/deferred.py:265`), the `uploaded_file_ext` dead-parameter note for the PR description,
P3-2 (`_name_from_url` helper), and the pre-existing `_get_runtime_context` template_config
mutation — that last one is a `dev` issue on its own merits, not this PR's.
