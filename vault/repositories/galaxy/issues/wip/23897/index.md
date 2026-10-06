# galaxy#23897 — XML `<output type="collection">` can never parse

[Issue](https://github.com/galaxyproject/galaxy/issues/23897) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

XML `<output type="collection">` has never parsed (since f5c93e868b7, 2018): `parse_outputs` copies `collection_type`/`collection_type_source` onto the element as `type`/`type_source`, setting the absent one to `None`, which lxml refuses; `type="data"` on the same element works; no known users; found while working on [#23890](https://github.com/galaxyproject/galaxy/pull/23890); next: pass attribute names to `_parse_collection` (copy-what's-present isn't enough — leaves `type="collection"`), parsing tests per form plus a framework test tool; decide whether to land in #23890 (`release_26.1`, keeps its new `Output` XSD docs true) or `dev`.
