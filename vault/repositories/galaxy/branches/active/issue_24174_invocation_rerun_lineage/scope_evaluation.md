Recommend **keeping the implemented scope** for issue [#24174](https://github.com/galaxyproject/galaxy/issues/24174): persistent immediate-source lineage, accessible direct-successor hints, rerun markers, and propagation through both workflow run forms. The indexed nullable self foreign key is an alternative explicitly described in the issue and fits the user's expectation of a database migration. No scope change or additional user decision is recommended; completion of remaining validation and the finalize procedure still determines READY status.

## As implemented: persistent direct lineage

Store an optional immediate source on each invocation, accept it through the invoke API after checking access, and propagate it through batch invocation and both rerun forms. Details expose accessible source/latest direct-rerun links, lists mark reruns, request exports remain independent replay templates, and model-store imports drop lineage; migration, API, model-store and browser coverage accompany the change.

| Pros | Cons |
| --- | --- |
| • Meets the core provenance, navigation and API use cases.<br>• Indexed reverse lookup supports newer-rerun hints.<br>• Keeps request replay and imported IDs unambiguous.<br>• Covers both forms. | • Requires migration support.<br>• Does not visually group whole lineages.<br>• Latest means latest accessible direct successor.<br>• Imported copies lose lineage. |

<details><summary>Fit to request and review recommendations</summary>

The issue describes invocation-list grouping illustratively and lists the indexed foreign key as an alternative suited to reverse lookups. The user explicitly anticipated a migration and UI/E2E work. The implementation follows a named alternative without changing the requested problem.

For I → J → K, K links to J and J links to I; I's newer-rerun hint links to J. Following direct links exposes the chain. Multiple direct children produce a link to the latest accessible child with deterministic ordering. The feature does not promise that I links directly to K or that sibling reruns form a flattened group.

Reviewed the plan, initial implementation debrief, backend/client normal reviews, and strict code-quality review. None recommends expanding or contracting feature scope. Backend recommendations concern serializer consistency and successor-selection coverage; strict review requires request context at the serialization boundary. These are corrections within scope. The optional combined inaccessible-newest/accessible-older test is validation depth. Removing redundant shallow UI assertions in favor of the new real-browser scenario changes test allocation, not feature scope. PostgreSQL migration execution remains a validation limitation to disclose, not a reason to introduce another storage design.

</details>

## Expand: transitive groups and latest descendant

Compute complete rerun chains or trees, group related invocations in lists, and let older runs jump directly to the newest accessible descendant. Retain immediate-source provenance underneath.

| Pros | Cons |
| --- | --- |
| • More directly realizes the illustrative grouped list.<br>• Reduces clicks across long chains.<br>• Supports later comparison tools. | • Needs branching and visibility semantics.<br>• Adds query, pagination and UI design work.<br>• Changes direct-successor meaning and requires new tests. |

<details><summary>Recommendation</summary>

Defer. The core loss is failure to persist the known immediate source. Direct links solve that and permit traversal. The plan explicitly excludes transitive grouping, and no reviewer identified it as necessary. Future grouping can reuse the indexed relation and invoke payload.

</details>

## Expand: preserve archive lineage

Serialize archive-local relations and remap them when source and rerun are imported together, explicitly handling missing sources. Reusable request exports would remain independent.

| Pros | Cons |
| --- | --- |
| • Retains provenance when moving complete analyses.<br>• Makes archived families more informative. | • Requires reference/remapping and partial-import rules.<br>• Expands compatibility and test requirements.<br>• Limited benefit when source is absent. |

<details><summary>Recommendation</summary>

Defer. The issue expressly accepts dropping or remapping lineage on import. Dropping meets that boundary and avoids interpreting database-local IDs on another instance. Independent reusable request exports remain necessary even if archive remapping is added later.

</details>

## Expand: edited-step metadata or request comparison

Record which step the client says was edited, or derive changes by comparing invocation requests, and display a more descriptive rerun notice.

| Pros | Cons |
| --- | --- |
| • Helps explain why a rerun exists.<br>• Supports related per-step iteration. | • Client assertions may be inaccurate.<br>• Step indices depend on workflow versions.<br>• Derived comparison introduces another interpretation problem. |

<details><summary>Recommendation</summary>

Defer. The issue presents this as an open question and the plan excludes it. Immediate-source provenance is useful without asserting which parameter or step changed. No review requires this information for the feature.

</details>

## Alternative: migration-free request metadata

Persist the source as a named request meta parameter instead of an indexed invocation column while retaining the same API and UI behavior.

| Pros | Cons |
| --- | --- |
| • Avoids a migration.<br>• Reuses request persistence. | • Reverse lookup filters unindexed text.<br>• List markers require parameter access.<br>• Import still needs filtering/remapping.<br>• Replaces completed work without adding behavior. |

<details><summary>Recommendation</summary>

Do not switch. Although this is the initial issue proposal, its discussion favors a column when reverse queries are expected. The implementation supplies those hints and markers, and the user anticipated migration work.

</details>

## Alternative: association table

Represent each source relation in a separate table modeled after workflow landing associations, retaining the same behavior.

| Pros | Cons |
| --- | --- |
| • Keeps optional relations outside invocation rows.<br>• Resembles an existing association pattern. | • Still requires migration.<br>• Adds an entity and constraints for a one-source relation.<br>• Does not extend requested behavior. |

<details><summary>Recommendation</summary>

Do not switch. Each invocation has at most one immediate source. The issue discussion and strict review support the nullable self reference as the simpler model for this cardinality.

</details>

## Contract: API-only or URL-only lineage

Persist source links but defer form propagation and presentation, or show a transient URL-derived link without persistence.

| Pros | Cons |
| --- | --- |
| • Smaller initial implementation.<br>• API-only support serves scripts. | • API-only leaves ordinary rerun users without the feature.<br>• URL-only loses provenance on reload and omits API/list use cases.<br>• Either contradicts requested UI work. |

<details><summary>Recommendation</summary>

Reject contraction. Both form paths and persistence are essential to preventing provenance loss at rerun submission. The browser scenario verifies that these pieces work together and belongs in the handoff.

</details>
