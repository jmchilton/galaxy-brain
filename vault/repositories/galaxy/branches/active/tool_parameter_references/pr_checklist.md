Run via Sonnet at default effort.

- [x] What does the user see when it fails? N/A, docs only (2 files: new `tool_parameter_references.md`, one toctree line in `doc/source/dev/index.rst`).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A, no code or tests.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A, no tests.
- [x] Are the comments free of excess archeology? N/A, no code comments; doc describes current dev (only "any more" at doc line 438).
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## Doc checks

- [x] Each "**Open:**" note links an issue/PR and is framed as proposed/reported. Lines 296-297 (#23884 / #24524) initially read as done; reworded to "proposes moving the advice to profile 26.0". Others pass: #23888 (449, "proposes"), #23981 (1144, "reports"), #23891/#23902 (238-243, "proposes"), #23895 (1013, "reports"), #23444 (6, "tracks").
- [x] Internal `(#anchor)` links resolve. All 22 distinct targets (at-a-glance, tool-syntax, api, workflows, verification-gaps, pipe-paths, tool-tests, legacy-tool-api, tool-request-api, format2-gxformat2, test-inputs, cheetah-templates, javascript-expressions, output-actions, rename-post-job-action, output-filters, dependent-parameters, yaml, other-accepted-forms, output-source-attributes, xml, parameter-names-in-responses) match a heading.
- [x] Claims added in last 4 commits match `reverification_2026-11.md`. Findings 1-11 and open-work links applied (type_source, linters, dialects, section JS shape, rename suffix, `when` editor, "Galaxy 26.2", section-drop gap row, #23888/#23891/#23902/#23895/#23981/#23444 notes).
- [x] No leftover "sections do not load" or removed YAML compatibility warning. Grep for "do not load", "cannot currently", "KeyError: 'blocks'", "compatibility", "AttributeError" finds none stale.
