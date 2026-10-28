Run via Opus 5.5 at high effort.

**Recommendation: keep scope as implemented.** The branch fixes #3899 fully: Pulsar now honours `container.resolve_dependencies` like the local path, via one shared predicate (`requires_dependency_resolution`) used by both `command_factory` and the Pulsar runner. The only expansion candidate found (opted-in containers with `dependency_resolution: remote` resolving deps on the host outside `docker run`) needs Pulsar-side command assembly changes, i.e. a cross-repo change with its own design questions, not a modest generalization. The shared abstraction the process asks for already exists in this branch.

## Possible Decompositions

~185 inserted lines (~80 lib, ~140 tests). Logical pieces, in landing order:

1. `requires_dependency_resolution` in `container_classes.py` + `command_factory.py` switch (pure refactor, no behaviour change).
2. Pulsar runner: `effective_dependency_resolution`, container lookup moved before dependency description, `__prepare_job` returns `dependencies_description`; unit tests.
3. Integration test `test_pulsar_embedded_containers.py` (host vs container cases).

1+2 are small enough that splitting gains little; 3 could ride separately only if Docker CI is a reviewer concern.

## Scope: as implemented

Pulsar runner downgrades `dependency_resolution` to `none` when the job's container (Galaxy-resolved or Pulsar remote container) doesn't opt into dependency resolution; local and Pulsar paths share one predicate.

| Pros | Cons |
|---|---|
| - Closes the issue exactly; matches long-standing local-runner semantics<br>- Introduces reusable predicate, removes duplicated condition<br>- Unit + Docker integration coverage, green in CI | - Opt-in + `remote` case still resolves deps outside the container (pre-existing)<br>- `__prepare_job` tuple grows 5 -> 6 |

## Scope: expand to fix opted-in container + `remote` resolution

Make opted-in containers get deps activated inside the container for Pulsar `remote` mode (debrief "Follow-up").

| Pros | Cons |
|---|---|
| - Completes container/dep semantics for Pulsar<br>- Touches the same decision point | - Requires Pulsar change (it prepends dep commands to whole command line); cross-repo + version gating<br>- Downgrading to `local` instead is wrong: Galaxy-side resolver paths don't exist on Pulsar host<br>- Rare config (opt-in containers are uncommon); behaviour unchanged by this branch |

<details><summary>Details</summary>
Better filed as a Pulsar issue plus a Galaxy follow-up gated on the Pulsar version. Folding it in would block a clean fix on a cross-repo release.
</details>

## Scope: expand to refactor `__prepare_job` return into a named result

Replace the 6-tuple with a dataclass (thermo-nuclear review "follow-up candidate").

| Pros | Cons |
|---|---|
| - Removes growing tuple smell | - Pure refactor in a 1500+ line file; adds review noise unrelated to the bug<br>- Not a behaviour/use-case generalization |

## Scope: expand to apply the predicate to other runners (Kubernetes/Pulsar-coexecution paths)

| Pros | Cons |
|---|---|
| - Would generalize if others had the bug | - Search of `lib/galaxy/jobs` found no other runner making its own dependency-resolution decision; all go through `command_factory`, which already uses the predicate. Nothing to expand to. |

## Scope: contract (drop integration test or predicate extraction)

| Pros | Cons |
|---|---|
| - Smaller diff | - Integration test is the only end-to-end proof (host control case)<br>- Predicate is the reusable abstraction reviewers prefer; dropping it reintroduces duplication |
