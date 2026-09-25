# PR 1386 — Sync planemo and planemo virtual appliance docs

`bernt-matthias:del-va` → `master`. Opened 2023-09-01. One line, one file.

```diff
--- a/docs/writing_standalone.rst
+++ b/docs/writing_standalone.rst
 .. include:: _writing_parameters.rst
+.. include:: _writing_publish_intro.rst
 .. include:: _writing_scripts.rst
```

## Verdict

**Merge as-is.** The change is correct, minimal, and closes a real gap. No code
update needed. Two things to handle around it: the PR body is not a description,
and the question it actually asks deserves an answer.

## Is it correct?

Yes — verified by building the docs on both branches.

`docs/writing_appliance.rst:19` has included `_writing_publish_intro.rst` since
`5c766c3d` ("Outline appliance-based publishing", 2015-07-05).
`docs/writing_standalone.rst` never did. The two tutorials are meant to be the
same material with a different environment chapter, so the standalone reader has
been missing the entire "Publishing to the Tool Shed" section for eleven years.

After the PR the two include lists differ only where they should:

| | standalone | appliance |
| --- | --- | --- |
| environment chapter | `_writing_test_and_serve` | `_writing_test_and_serve_appliance` |
| `_writing_argparse` | yes | no |

**No new Sphinx warnings.** Built both branches with sphinx + rtd-theme +
recommonmark; both exit 0 with an *identical* set of 22 warnings (pre-existing:
a missing `standards/docs/best_practices` toctree entry, autodoc failing to
import `planemo.output_models` under pydantic). Normalised and diffed — clean.

**No link-target collisions.** `_writing_publish_intro.rst` defines external
targets (`Galaxy Tool Shed`, `Tool Shed Wiki`, `package definition`,
`tools-iuc`). None collide with the other seven includes pulled into
`writing_standalone.rst`, nor with that file's own footer
(`Galaxy`/`GitHub`/`Docker`/`Homebrew`/`linuxbrew`/`Vagrant`/`Planemo`).
Duplicating an include across two *documents* is fine — each has its own
target namespace.

**It renders.** `writing_standalone.html` grows 99,717 → 108,773 bytes and
gains `id="publishing-to-the-tool-shed"`, which is absent on master.

**CI is green**, including `test (3.10, lint_docs)` — that job pipes sphinx
output through `build_scripts/lint_sphinx_output.py`, and since the warning set
is unchanged it has nothing new to catch. Branch is `MERGEABLE` at `9b1ea0b6`.

## Follow-up this PR enables

`docs/_writing_testing.rst:257` deep-links out to
`writing_appliance.html#publishing-to-the-tool-shed` — a reader of the
*standalone* tutorial gets bounced into the *appliance* tutorial, purely because
the standalone doc had no such anchor. It does now. That link should be
repointed at `writing_standalone.html`. Small, independent, and it decouples one
more thing from the appliance docs ahead of any removal.

## The question in the PR body

> "I am wondering what this virtual appliance thing is anyway for many years?
> Was wondering if we can remove this, ie. `docs/writing_appliance.rst`"

Never answered in three years. The evidence says the appliance is dead:

| distribution channel | state |
| --- | --- |
| `images.galaxyproject.org/planemo/latest.ova` | 200, but `Last-Modified: 2019-06-21` (5.5 GB) |
| `images.galaxyproject.org/planemo/latest.box` | 200, but `Last-Modified: 2015-06-26` (2.1 GB) |
| `registry.hub.docker.com/u/planemo/interactive/` | **404** |
| `storage.googleapis.com/galaxyproject_images/planemo_machine.image.tar.gz` | **404** |

The build tooling, `jmchilton/planemo-machine`, was last pushed 2018-05-29 and
is not archived. Doc mtimes agree: `writing_appliance.rst` 2016-06-22,
`_writing_test_and_serve_appliance.rst` 2016-06-21, `appliance.rst` 2019-07-02.

So half the download links 404 and the surviving images ship a Galaxy from 2019
and 2015 respectively. Anyone following `writing_appliance.rst` today either
hits a dead link or boots a seven-year-old environment.

Removal is justified, but it is a **separate PR** — it would touch
`appliance.rst`, `writing_appliance.rst`, `writing_cwl_appliance.rst`,
`_writing_test_and_serve_appliance.rst`, the toctrees in `index.rst`,
`writing.rst`, `writing_cwl.rst`, and the inbound prose references in
`_writing_publish_intro.rst:12` and `_writing_testing.rst:257`. Do not
entangle it with a one-line include fix that is already green.

Worth noting the irony: if the appliance docs go, `_writing_publish_intro.rst`
would lose its only consumer *unless* this PR lands first. 1386 is a
prerequisite for the deletion, not an alternative to it.

## Before merging

1. **Rewrite the PR body.** It is a question, not a description, and it would
   become the squash-commit message. Something like: "The standalone tool
   development tutorial was missing the Publishing to the Tool Shed section that
   the appliance tutorial has included since 2015."
2. Decide separately on appliance removal; if yes, open it as its own PR and
   reference the evidence above.

## Open questions

- Repoint `_writing_testing.rst:257` at the standalone anchor — fold into this
  PR, or keep 1386 a pure one-liner and do it separately?
- Remove the appliance docs? Evidence says yes. Anyone still using the OVA?
- The CWL tutorial pair (`writing_cwl_standalone.rst` /
  `writing_cwl_appliance.rst`) is **already symmetric** — both include only
  `_writing_cwl_intro.rst`, so there is no equivalent gap to fix there. It does
  carry the same appliance toctree entry via `writing_cwl.rst:15`, so it is in
  scope for an appliance removal but not for this PR.
