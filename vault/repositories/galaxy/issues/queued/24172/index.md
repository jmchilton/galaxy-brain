# galaxy#24172 — Column parameters show "No options available." until their dataset finishes, so tools and workflows can't be queued on it

[Issue](https://github.com/galaxyproject/galaxy/issues/24172)

Filed 2026-10-15 from [proposal](proposal.md) ([source draft](raw.md), [debrief](debrief.md)). Assigned to jmchilton.

Regression of #3758 since 23.1 (#16010): the form ignores the server's `textable: true`, so a column param on a not-ready dataset shows "No options available." and blocks submit.

Next: red client test that a textable param with no options renders a text field; then restore it.
