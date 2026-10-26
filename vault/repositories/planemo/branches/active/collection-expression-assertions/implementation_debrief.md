# Implementation debrief

Planemo owns #1759. Galaxy's `output_to_cwl_json` intentionally parses expression.json datasets to CWL values. Planemo discarded the file properties returned by its download callback and then passed parsed values to a file verifier. Changing the upstream converter would break its CWL contract.

The collection adapter retains primary downloaded dataset properties by dataset ID and attaches them to expression.json leaves. Collection nesting follows Galaxy element metadata rather than Python list values, so JSON arrays remain datasets. CWL outputs retain parsed values. Invalid collection leaf properties now produce a per-output assertion problem naming the collection and element.

Regression tests invoke the real installed galaxy-tool-util converter and verifier with mocked Galaxy metadata and downloads. Six JSON values (null, boolean, number, string, array, object), flat/nested collections, and Galaxy/CWL workflows are covered. Negative assertions prove that nested tests run. A mixed collection tests distinct expression paths alongside an ordinary dataset, including the output_id path.

Before implementation, 12 Galaxy cases failed with the reported TypeError/KeyError or JSON-array nesting assertion; 12 CWL cases and the existing unsupported-collection guard passed. After implementation, 43 tests passed across test_collect_outputs.py, test_runnable.py, and test_output_schema.py. No live Galaxy server was used.

Normal review found no blockers; its suggested mixed collection regression was added. Further hardening and polish are recorded separately.
