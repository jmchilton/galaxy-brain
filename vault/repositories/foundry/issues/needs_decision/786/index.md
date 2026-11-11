# #786 UDT authoring: prefer quay.io/biocontainers images, and check which containers the target Galaxy runs for UDTs

[Issue](https://github.com/galaxyproject/foundry/issues/786) — opened by AnnaSyme's AI assistant (BioHackathon 2026, OceanOmics-amplicon-nf run). Labels: `needs-triage`, `BioHackEU26`. No comments, PR or branch. Triaged 2026-11-11 against `origin/main` `3060503e`.

## Proposed labels

Staged in [issue_tags.md](issue_tags.md). Keep `BioHackEU26`.

- `roadmap/substep`, parent #501 (Improved Support for Tool Development): UDT-authoring guidance; #672 and #468 sit there already.
- `priority/mvp`: once Galaxy #24635 deploys, every UDT whose image isn't `quay.io/biocontainers/*` is refused on a default server, so runs fail.
- `work/ready-implement`: suggestions 2 and 3 are text changes to known files (below). No `upstream/galaxy`: the Galaxy change merged.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3.

## Findings

Verified:

- **Galaxy [#24635](https://github.com/galaxyproject/galaxy/pull/24635) merged 2026-11-11 into `release_26.2`.** Not released or deployed yet. It adds `user_defined_tool_allowed_containers`, default `quay.io/biocontainers/*`. It checks at creation, where a 400 lists the allowed entries, and at job time, against the declared containers.
- **Two separate gates.** The run's error ("Failed to find a container when required") is job-time container *resolution*, not the allowlist. A server can allow an image and still fail to resolve it, for example when admins map images to CVMFS Singularity paths. A creation 400 shows the policy; only a probe job shows the resolver. The issue merges the two.
- **The rule that picked the Docker Hub images.** `galaxy-user-tool-authoring/index.md:143` (§7; the issue's `:125` is §6 now) says "Prefer a container the source actually evidences". The author Mold `:99` and `SKILL.md:75` say "BioContainers **or** directly evidenced containers", with no order between them.
- **The component note contradicts its own Review Required list.** `component-nextflow-containers-and-envs/index.md:276` lets `docker://docker.io/...` with a tag be emitted directly. `:289` lists Docker Hub short names as Review Required. The new default refuses both.
- **`biocontainers/x` is not `quay.io/biocontainers/x`.** `summarize-nextflow/index.md:160,344` treats a bare `biocontainers/<name>` as the same biocontainer. Under #24635's canonicalization it becomes `docker.io/biocontainers/<name>`, which `quay.io/biocontainers/*` does not match. Authoring has to rewrite it to `quay.io/`. This comes from the PR body's matching rules; I didn't run Galaxy.
- **The `ubuntu:20.04` gap.** §7 `:150` says a builtins-only command needs "no packages", but nothing says which container to write then, or to omit one. That is where the agent picked `ubuntu:20.04`.
- **No preflight exists.** Nothing in `content/` probes the target Galaxy's UDT container policy. `nextflow-summary-to-workflow-brief/index.md:89` covers "container preferences" and environment probes, but not on Galaxy.

Not verified: the test server's resolver config; whether mulled images exist for the five custom Docker Hub images' packages.

## Implementation scope (for whoever picks it up)

- §7, author Mold `:99` and `SKILL.md:75`: put `quay.io/biocontainers` first. A source image outside it is an open requirement, with the issue's three options, raised before the test phase.
- Component note `:276`: move Docker Hub images to Review Required. Rewrite bare `biocontainers/` to `quay.io/biocontainers/`.
- §7: say what to write for a builtins-only command (omit `container`, or name a stated minimal biocontainer).
- Treat a creation 400 that lists allowed entries as a known failure, with a fix in the debug/authoring guidance.

## Questions for John

1. Probe job (suggestion 1): it creates tools on the user's server and has to deactivate them afterwards. Should it go in brief preflight (`nextflow-summary-to-workflow-brief`), the test phase, or nowhere, relying on the creation 400 once #24635 deploys?
2. Builtins-only UDTs: omit `container`, or pick a fixed biocontainer (e.g. `quay.io/biocontainers/coreutils`)?

## Related

- #772 (untriaged): container-only processes get no tool; same container path.
- #723 (untriaged): "use an existing Galaxy tool" is one of the issue's fallback options.
- #785 (merged): UDT job shell is `/bin/sh`; the image check needs it.
- #566 (untriaged): import guidance for a real Galaxy.

## Next

Once labels are applied: implement per the scope above. No upstream issue to file.
