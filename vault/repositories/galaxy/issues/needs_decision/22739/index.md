# galaxy#22739 — Refactor: Extract `Tool.to_json` into a `ToolFormBuilder` module & proper types

[Issue](https://github.com/galaxyproject/galaxy/issues/22739)

Extract `Tool.to_json` into a `ToolFormBuilder` module with richer types and a clear boundary against legacy `basic.py`; the plan is published at <https://jmchilton.github.io/galaxy-brain/plans/toolformpopulaterefactor/> and needs agreement before any code moves.
