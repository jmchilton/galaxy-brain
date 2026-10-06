# galaxy#23444 — Define nested parameter references for tool output sources

[Issue](https://github.com/galaxyproject/galaxy/issues/23444)

Settle the canonical nested parameter-reference syntax for YAML/user-defined tools before adding model-level `format_source`/`metadata_source` validation, so runtime, linting, and Pydantic validation stop diverging; blocked on: John answering mvdbeek's two direct questions on the scoping comment — whether literal input names containing path punctuation need supporting at all (are there any in the IUC?), and whether `collection.forward` should be the preferred spelling over `collection["forward"]`, supporting both but asking for the former. Answering unblocks implementation.
